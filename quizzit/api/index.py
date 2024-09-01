from collections import defaultdict, deque
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_file
import requests
from ocr import *
import os
from PyPDF2 import PdfReader
from flask_cors import CORS
from fpdf import FPDF
from email_validator import validate_email, EmailNotValidError
import firebase_admin
from firebase_admin import credentials, storage
from dotenv import load_dotenv
import io
from langchain_chroma import Chroma
from langchain.docstore.document import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google.generativeai import GenerativeModel, configure, GenerationConfig
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts.chat import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.combine_documents.stuff import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_core.messages.human import HumanMessage
from langchain_core.messages.ai import AIMessage
from vertexai.preview import tokenization

# __import__('pysqlite3')
# import sys
# sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')

load_dotenv()
# prevent the warning that arises when using the Gemini API
os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GLOG_minloglevel"] = "2"

# variables related to configuring the Gemini API and setting up the necessary parameters
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
configure(api_key=GOOGLE_API_KEY)
GEMINI_MAX_TOKENS = 1_048_576
tokenizer = tokenization.get_tokenizer_for_model("gemini-1.5-flash")

rag_llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=GOOGLE_API_KEY) # for the RAG pipeline

# primarily for the document summary and document question generation endpoints
def get_model(system_prompt: str):
    return GenerativeModel("gemini-1.5-flash", system_instruction=system_prompt, generation_config=GenerationConfig(
        max_output_tokens=300,
        temperature=0.5
    ))

# variables related to the RAG pipeline and conversation logs
vector_db = None
doc_chain = None
retrieval_chain = None
answer_retriever = None

# contains token information per conversation thread as follows:
    # (number of tokens in history passed in, number of tokens in query, number of tokens in response)
conversation_threads = deque()

system_prompt = (
    "You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise."
    "\n\n"
    "{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

# initialize the firebase application using the admin sdk
firebase_admin.initialize_app(
    credentials.Certificate({ \
        "type": "service_account", \
        "project_id": os.environ.get('PROJECT_ID'), \
        "private_key_id": os.environ.get('PRIVATE_KEY_ID'), \
        "private_key": os.environ.get('PRIVATE_KEY').replace('\\n', '\n'), \
        "client_email": os.environ.get('CLIENT_EMAIL'), \
        "client_id": os.environ.get('CLIENT_ID'), \
        "auth_uri": os.environ.get('AUTH_URI'), \
        "token_uri": os.environ.get('TOKEN_URI'), \
        "auth_provider_x509_cert_url": os.environ.get('AUTH_PROVIDER_X509_CERT_URL'), \
        "client_x509_cert_url": os.environ.get('CLIENT_X509_CERT_URL'), \
    }), {'storageBucket': os.environ.get('STORAGE_BUCKET')})

# initializing the application and enabling CORS along with retrieving the storage bucket
app = Flask(__name__)
CORS(app)
bucket = storage.bucket()

def extract_file_contents(file_bytes: bytes) -> Dict[str, str]:
    """
    Function that takes in the raw byte contents of a user uploaded file and returns a dictionary containing the extracted text by page.
    """
    pdf_images = convert_to_image(file_bytes)
    text_contents = process_pdf_page(pdf_images) 
    return text_contents

def initialize_qa_chain(file: str, username: str) -> None:
    """
    The function triggered by the /signal_doc_qa_selection endpoint that instantiates a new RAG pipeline when the user wants to ask questions to the chatbot about a specific document.
    """
    global vector_db
    global doc_chain
    global retrieval_chain
    global answer_retriever

    blob = bucket.blob(f"{username}/{file}")
    url = blob.generate_signed_url(datetime.now() + timedelta(hours=24))
    req = requests.get(url)
    assert req.status_code == 200
    text_contents = extract_file_contents(req.content)

    docs = [Document(page_content=text_contents[page], metadata={"source": file}) for page in text_contents]
    
    splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=400)
    split_docs = splitter.split_documents(docs)

    vector_db = Chroma.from_documents(split_docs, GoogleGenerativeAIEmbeddings(
        model="models/embedding-001"
    ))
    retriever = vector_db.as_retriever(search_kwargs={"k": 3})

    doc_chain = create_stuff_documents_chain(rag_llm, prompt)
    retrieval_chain = create_retrieval_chain(retriever, doc_chain)

    answer_retriever = retrieval_chain

@app.route("/check_files", methods = ["GET"])
def return_file_count():
    """
    Endpoint that checks whether the currently logged in user has uploaded any files.
    """
    username = request.args.get("username")
    blobs = list(bucket.list_blobs(prefix=f"{username}/"))
    if len(blobs) > 0:
        return jsonify({"filesExist": True})
    return jsonify({"filesExist": False})

@app.route("/fetch_files", methods = ["GET"])
def get_files():
    """
    Endpoint that retrieves a list of files uploaded by the currently logged in user
    """
    username = request.args.get("username")
    blobs = list(bucket.list_blobs(prefix=f"{username}/"))
    blobs = list(map(lambda blob: blob.name[blob.name.rfind("/") + 1:], blobs))
    return jsonify({"files": blobs})

@app.route("/check-email-validity", methods = ["GET"])
def check_validity():
    """
    Endpoint that checks the validity of the email that a user signs up with. Checks for valid regex, including whether emails can be sent to that particular one.
    """
    email = request.args.get("email")
    try:
        res = validate_email(email, check_deliverability=True)
        return jsonify({"result": res.normalized, "status": 200})
    except EmailNotValidError as err:
        print(f"Error: {err}")
        return jsonify({"result": str(err), "status": 500})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"result": "Internal server error", "status": 500})
    
@app.route("/upload_file", methods = ["POST"])
def process_uploaded_file():
    """
    Endpoint to handle file processing and sending it back to the frontend for upload to storage
    """
    try:
        if request.method == "POST" and "upload" in request.files:
            username = request.args.get("username")
            file = request.files["upload"]
            name = file.filename

            # if there's no extension associated with the file
            if name.rfind(".") == -1:
                return jsonify({"status": "You need to upload a file that has an extension"})
        
            # check if this file is a PDF
            extension = name[name.rfind(".") + 1:]
            if extension != "pdf":
                return jsonify({"status": "Make sure you upload a PDF file only!"})

            # check whether file is not empty to ensure tesseract compatibility
            file.seek(0, os.SEEK_END)
            bytes = file.tell()
            if bytes == 0:
                return jsonify({"status": "Please make sure you upload a non-empty PDF document"})
            file.seek(0)

            # ensure page limit isn't exceeded
            reader = PdfReader(file)
            if len(reader.pages) > 75:
                return jsonify({"status": "PDFs with a page count greater than 75 are not allowed. Please try again!"})
            
            # if this file has already been uploaded previously
            blobs = list(bucket.list_blobs(prefix=f"{username}/"))
            if len(blobs) > 0:
                blobs = list(map(lambda blob: blob.name[blob.name.rfind("/") + 1:], blobs))
                if name[:name.rfind(".")] + ".pdf" in blobs:
                    return jsonify({"status": "This file already exists. Please select a different one and try again"})
            
            return jsonify({"status": "PDF OK"})
        
    except Exception as e: 
        return jsonify({"status": "Error when uploading the file. Please try again!"})

@app.route("/generate_summary", methods = ["GET"])
def summarize_text():
    """
    Endpoint that takes in the user uploaded document as input and returns a dictionary containing a page-by-page summary of the document along with its statistics.
    """
    username, file = request.args.get("username"), request.args.get("file")

    blob = bucket.blob(f"{username}/{file}")
    doc_url = blob.generate_signed_url(expiration=datetime.now() + timedelta(hours=24))
    req = requests.get(doc_url)
    assert req.status_code == 200

    text_contents = extract_file_contents(req.content) # req.content represents the bytes of the file
    text_statistics = calculate_text_statistics(text_contents)

    system_prompt = "As a professional summarizer, create a concise and comprehensive summary of the provided text, be it an article, post, conversation, or passage, while adhering to these guidelines:\n1. Craft a summary that is detailed, thorough, in-depth, and complex, while maintaining clarity and conciseness.\n2. Incorporate main ideas and essential information, eliminating extraneous language and focusing on critical aspects.\n3. Rely strictly on the provided text, without including external information.\n4. Format the summary in paragraph form for easy understanding."

    llm = get_model(system_prompt)

    page_groups = []
    # if there are 15+ pages
    if len(text_contents) >= 15:
        page_text = list(text_contents.values())
        # each subarray in the array will contain text from 5 pages
        for i in range(0, len(page_text), 5):
            page_groups.append(page_text[i:i+5])
    
    summarized_text = defaultdict(str)
    
    if page_groups:
        start, end = 1, 5
        for i in range(len(page_groups)):
            curr_len = len(page_groups[i])
            if i > 0:
                if curr_len == 5:
                    start, end = start + 5, end + 5
                else:
                    start, end = start + 5, end + curr_len
            summarized_text[f"Pages {start}-{end}"] = llm.generate_content("\n\n".join(page_groups[i])).text
    else:
        for page in text_contents:
            summarized_text[page] = llm.generate_content(text_contents[page]).text

    # returning a dictionary that contains a page-by-page summary of the document
    return jsonify({"summarized_text": list(summarized_text.items()), "statistics": text_statistics})

@app.route("/signal_doc_qa_selection", methods = ["POST"])
def invoke_doc_processal():
    """
    Endpoint that is triggered when the user selects a document to ask questions about to the chatbot. Resets all the RAG pipeline values and then re-updates them through the initialize_qa_chain function.
    """
    global vector_db
    global doc_chain
    global retrieval_chain
    global answer_retriever

    # clear out any previous values to ensure compatibility with the new document
    vector_db = None
    doc_chain = None
    answer_retriever = None
    retrieval_chain = None
    conversation_threads.clear()

    file = request.args.get("file")
    username = request.args.get("username")

    # update all the values once again through this function
    initialize_qa_chain(file, username)

    return jsonify({"status": "OK"})

@app.route("/get_model_response", methods = ["POST"])
def fetch_response():
    """
    Endpoint responsible for fetching a response from the LLM in response to a user query.
    """
    data = request.json
    query, history, used_tokens = data.get("query"), data.get("history"), data.get("usedTokens")

    modified_history, history_tokens = deque(), 0
    token_limit_exceeded = False
    
    query_tokens = tokenizer.count_tokens(query).total_tokens

    # handle chat history truncation
    if query_tokens + used_tokens >= GEMINI_MAX_TOKENS:
        token_limit_exceeded = True
        current = query_tokens + used_tokens
        while current >= GEMINI_MAX_TOKENS:
            # for one given thread
            h_tokens, q_tokens, ans_tokens = conversation_threads.popleft()
            overall = h_tokens + q_tokens + ans_tokens
            current -= overall
            used_tokens -= overall

            # removing one interaction(Human + AI)
            modified_history.popleft()
            modified_history.popleft()

            # updating history passed in from session storage on client because this history will be sent back
            history["user"].pop(0)
            history["bot"].pop(0)

    elif history["user"] and history["bot"]:
        contents = list(zip(history["user"], history["bot"]))
        # include tokens for whatever history is passed in 
        for user, bot in contents:
            total = tokenizer.count_tokens(user).total_tokens + tokenizer.count_tokens(bot).total_tokens
            history_tokens += total
            used_tokens += total
            modified_history.append(HumanMessage(user))
            modified_history.append(AIMessage(bot))
    
    # including tokens used for query
    used_tokens += query_tokens
    
    try:
        response = answer_retriever.invoke({"input": query, "chat_history": list(modified_history)})["answer"]
        response_tokens = tokenizer.count_tokens(response).total_tokens

        # including tokens used for response
        used_tokens += response_tokens

        conversation_threads.append((history_tokens, query_tokens, response_tokens))

        return jsonify({"response": response, "usedTokens": used_tokens, "updatedHistory": history if token_limit_exceeded else None})

    except AttributeError:
        return jsonify({"response": "An error occurred..."})

@app.route("/generate_pdf", methods = ["POST"])
def generate_questions_pdf():
    """
    Endpoint responsible for taking in an array of question types and the document, generating a PDF with test/quiz questions, and then sending it back to the frontend.
    """
    data = request.json
    question_types = data.get("questionTypes") # array of all the selected options
    file = data.get("file")
    username = data.get("username")

    print(f"question types: {question_types}")

    main_blob = bucket.blob(f"{username}/{file}")
    download_url = main_blob.generate_signed_url(datetime.now() + timedelta(hours=24))
    req = requests.get(download_url)
    assert req.status_code == 200
    text_contents = extract_file_contents(req.content)

    # creating chunks of size 5 from the document in case it is too long
    doc_groups = []
    if len(text_contents) >= 15:
        page_contents = list(text_contents.values())
        for i in range(0, len(page_contents), 5):
            doc_groups.append(page_contents[i:i+5])

    system_prompt = f"""
    You are a highly knowledgeable assistant tasked with generating insightful and useful questions based on the provided document text. Your goal is to help a user deepen their understanding of the document's content, whether they are studying for a test, preparing for a discussion, or seeking a more comprehensive grasp of the material.

    Instructions:

    1. Generate questions that are clear, thought-provoking, and cover key concepts and details presented in the text.
    2. Focus on the following question types: {question_types}.
    3. The number of questions should be proportional to the amount and complexity of the information in the text block.
    4. Number each question for clarity and consistency.

    Your goal is to ensure the questions facilitate a deeper understanding of the content, encourage critical thinking, and highlight essential themes and details.
    """

    def inject_prompt(text: str) -> str:
        return f"Generate a question or several questions based on the following text block.\n Text block: {text}"
    
    questions = defaultdict(str)
    model = get_model(system_prompt)

    # number of split documents is < 15
    start_page = 1
    if not doc_groups:
        for page_text in text_contents.values():
            response = model.generate_content(inject_prompt(page_text))
            questions[f"Page {start_page}"] = response.text
            start_page += 1
    # number of split documents >= 15
    else:
        start, end = 1, 5
        for i in range(len(doc_groups)):
            curr_len = len(doc_groups[i])
            if i > 0:
                if curr_len == 5:
                    start, end = start + 5, end + 5
                else:
                    start, end = start + 5, end + curr_len
            text = "\n\n".join(content for content in doc_groups[i])
            response = model.generate_content(inject_prompt(text))
            questions[f"Pages {start}-{end}"] = response.text
    
    print(f"questions: {questions}")
    
    pdf = FPDF()
    pdf.set_auto_page_break(True)
    pdf.add_page()
    pdf.set_font("Helvetica", size=10)
    
    for pair in questions:
        pdf.multi_cell(375, 5, f"{pair}\n{questions[pair]}")
        pdf.ln(5)
    
    result_file = io.BytesIO()
    pdf.output(result_file)
    result_file.seek(0)

    return send_file(result_file, mimetype="application/pdf", as_attachment=True, download_name=f"{file[:file.rfind('.')]}-generatedQuestions.pdf")

if __name__ == "__main__":
    app.run(debug = True)
    
# from flask import Flask
# app = Flask(__name__)

# @app.route("/api/python")
# def hello_world():
#     return "<p>Hello, World!</p>"