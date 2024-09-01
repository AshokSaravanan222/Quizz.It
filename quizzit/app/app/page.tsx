import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../../firebase";
import { signOut } from "firebase/auth";
import { ref, uploadBytes } from "firebase/storage";
import Loading from "@/components/Loading";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useRouter } from "next/navigation";

export default function App() {
  const [fileUploadStatus, setFileUploadStatus] = useState("");
  const [summaryFileStatus, setSummaryFileStatus] = useState("");
  const [generateQuestionFileStatus, setGenerateQuestionFileStatus] =
    useState("");
  const [askQuestionFileStatus, setAskQuestionFileStatus] = useState("");

  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dialogIsOpen, setDialogIsOpen] = useState(false);

  const router = useRouter();

  const toggleDialogDisplay = (state: boolean) => {
    setDialogIsOpen(state);
  };

  useEffect(() => {
    setUsername(sessionStorage.getItem("username") ?? "unknown");
  }, []);

  async function logOut(e: React.MouseEvent) {
    e.preventDefault();
    await signOut(auth)
      .then(() => {
        sessionStorage.removeItem("username");
        toggleDialogDisplay(false);
        setIsLoading(true);
        setTimeout(() => {
          router.push("/login");
          setIsLoading(false);
        }, 2000);
      })
      .catch((err) => {
        console.log(err);
        toggleDialogDisplay(false);
      });
  }

  async function uploadFileToStorage(fileName: string, uploadFile: Blob) {
    const fileStorage = ref(storage, `${username}/${fileName}`);
    await uploadBytes(fileStorage, uploadFile).then((snapshot) => {
      setFileUploadStatus("File uploaded successfully");
    });
  }

  const uploadFile = async (e: React.MouseEvent) => {
    e.preventDefault();

    setSummaryFileStatus("");
    setGenerateQuestionFileStatus("");
    setAskQuestionFileStatus("");

    let file_input = document.querySelector("#upload") as HTMLInputElement;
    let formData = new FormData();

    if (!file_input) {
        return;
    }
    if (!file_input.files) {
        return;
    }

    if (!(file_input.files[0] === undefined)) {
      let file = file_input.files[0];
      setFileUploadStatus("Upload in progress...");
      formData.append("upload", file);

      await fetch(
        `${window.location.origin}/api/upload_file?username=${username}`,
        {
          method: "POST",
          body: formData,
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "PDF OK") {
            uploadFileToStorage(file.name, file);
          } else {
            setFileUploadStatus(data.status);
          }
        });
    } else {
      setFileUploadStatus("Make sure you have selected a file!");
    }
  };

  const determine_route = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    fetch(`${window.location.origin}/api/check_files?username=${username}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        let status = data.filesExist;
        let defaultMessage = "You haven't uploaded any files yet!";
        if (page === "summary") {
          status
            ? router.push("/fetch_summarize_files")
            : setSummaryFileStatus(defaultMessage);
        } else if (page === "questionGeneration") {
          status
            ? router.push("/fetch_questions_files")
            : setGenerateQuestionFileStatus(defaultMessage);
        } else if (page === "chatbot") {
          status
            ? router.push("/fetch_ask_questions_files")
            : setAskQuestionFileStatus(defaultMessage);
        } else {
          throw new Error("Invalid page provided!");
        }
      });
  };

  return (
    <>
      {isLoading ? (
        <Loading
          action={"Sign out successful. Redirecting you to the login page..."}
        />
      ) : (
        <>
          <nav className="navbar">
            <div className="navbar__container">
              <div id="navbar__logo">QuizzIt</div>
              <div className="navbar__buttons">
                <button
                  onClick={() => setDialogIsOpen(true)}
                  className="navbar__button"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => router.push("/forgot_password")}
                  className="navbar__button"
                >
                  Forgot Password?
                </button>
              </div>
              <Dialog
                open={dialogIsOpen}
                onClose={() => toggleDialogDisplay(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">{"Sign Out?"}</DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                    Are you sure you want to sign out?
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => toggleDialogDisplay(false)}>
                    Disagree
                  </Button>
                  <Button
                    onClick={(e) => {
                      logOut(e);
                    }}
                    autoFocus
                  >
                    Agree
                  </Button>
                </DialogActions>
              </Dialog>
            </div>
          </nav>

          <div className="intro" id="home">
            <div className="intro__container">
              <h1 className="intro__heading">
                Welcome to <span>QuizzIt</span> {username}
              </h1>
              <p className="intro__description">
                Please Upload Your File Below
              </p>
            </div>
            <section className="intro__section">
              <form
                id="uploadForm"
                method="post"
                encType="multipart/form-data"
                action=""
              >
                <input
                  type="file"
                  id="upload"
                  name="upload"
                  className="select__button"
                />
                <br />
                <input
                  type="submit"
                  value="Upload"
                  id="uploadButton"
                  className="upload__button"
                  onClick={(e) => uploadFile(e)}
                />
              </form>
              <div className="file_upload_status">{fileUploadStatus}</div>
            </section>
          </div>

          <div className="options" id="options">
            <h1>Choose Your Direction</h1>
            <div className="options__wrapper">
              <div className="options__card">
                <h2>Document too long?</h2>
                <p>We got your back!</p>
                <div className="summary_button">
                  <button onClick={(e) => determine_route(e, "summary")}>
                    Generate Summary
                  </button>
                </div>
                <div className="summaryFilesStatus">{summaryFileStatus}</div>
              </div>
              <div className="options__card">
                <h2>Studying for a test?</h2>
                <p>We can quiz you!</p>
                <div className="questions_button">
                  <button
                    onClick={(e) => determine_route(e, "questionGeneration")}
                  >
                    Generate Test Questions
                  </button>
                </div>
                <div className="generateQuestionFilesStatus">
                  {generateQuestionFileStatus}
                </div>
              </div>
              <div className="options__card">
                <h2>Have questions about the document?</h2>
                <p>We can help you with that</p>
                <div className="ask_question_button">
                  <button onClick={(e) => determine_route(e, "chatbot")}>
                    Ask a Question
                  </button>
                </div>
                <div className="askQuestionFilesStatus">
                  {askQuestionFileStatus}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
