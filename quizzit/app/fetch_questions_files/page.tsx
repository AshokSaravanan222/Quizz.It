/**
 * app/fetch_questions_files/page.tsx
 * Fetch questions files page for the Quizz.It application
 * @SXV357
 * 08-24-2024
 */
"use client"
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import "../../styles/generation.css";
import "../../styles/selection.css";
import { useRouter } from "next/navigation";

export default function QGenerationSelection() {
  const [questionGenerationFiles, setQuestionGenerationFiles] = useState([]);
  const [generatePDFStatus, setGeneratePDFStatus] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");

  const username = sessionStorage.getItem("username");

  const router = useRouter();

  useEffect(() => {
    fetch(`${window.location.origin}/api/fetch_files?username=${username}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => setQuestionGenerationFiles(data.files));
  }, []);

  const generateQuestions = (e: React.MouseEvent) => {
    e.preventDefault();
    let questionType = document.getElementById("questionType") as HTMLSelectElement;
    let fileDownload = document.getElementById("questionsDownload") as HTMLAnchorElement;

    fileDownload.style.display = "none";

    const questionTypes = Array.from(questionType.options)
      .filter((option) => option.selected)
      .map((option) => option.value);

    if (questionTypes.length === 0) {
      setGeneratePDFStatus("You need to select atleast one question type!");
      return;
    } else if (selectedFile === "") {
      setGeneratePDFStatus("Make sure you have selected a file!");
      return;
    }

    setIsDisabled(true);
    setGeneratePDFStatus("Please wait as the questions are being generated...");

    fetch(`${window.location.origin}/api/generate_pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionTypes: questionTypes,
        file: selectedFile,
        username: username,
      }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        fileDownload.style.display = "block";
        fileDownload.href = URL.createObjectURL(blob);
        fileDownload.download =
          selectedFile.substring(0, selectedFile.lastIndexOf(".")) +
          "-generatedQuestions.pdf";

        setIsDisabled(false);
        setGeneratePDFStatus("Questions generated successfully!");
      })
      .catch((err) => {
        console.log(err);
        setGeneratePDFStatus(
          "There was an error when generating the questions and exporting them as a PDF. Please try again!"
        );
      });
  };

  return (
    <>
      <div id="container">
        <h2>Question Generation Document Selection</h2>
        <form id="questionForm">
          <label htmlFor="questionType">Select Question Type:</label>
          <select
            id="questionType"
            name="questionType"
            multiple
            disabled={isDisabled}
            onFocus={() => setGeneratePDFStatus("")}
          >
            <option value="multipleChoice">Multiple Choice</option>
            <option value="shortAnswer">Short Answer</option>
            <option value="trueAndFalse">True and False</option>
          </select>

          <label htmlFor="questionFileSelect">
            Choose a file to generate questions based off of:
          </label>
          <select
            id="questionFileSelect"
            name="questionFileSelect"
            disabled={isDisabled}
            onChange={(e) => setSelectedFile(e.target.value)}
            value={selectedFile}
            onFocus={() => setGeneratePDFStatus("")}
          >
            <option value="" disabled>
              Select a file
            </option>
            {questionGenerationFiles.map((file, idx) => {
              return (
                <option key={idx} value={file}>
                  {file}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            disabled={isDisabled}
            id="btn"
            onClick={(e) => generateQuestions(e)}
          >
            Generate Questions
          </button>
        </form>
        <button
          id="toHomePage"
          disabled={isDisabled}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            router.push("/app")
          }}
        >
          Go To Home Page
        </button>
        <div className="status">{generatePDFStatus}</div>
      </div>
      <a
        href="#"
        id="questionsDownload"
        style={{ display: "none", margin: "0 auto", textAlign: "center" }}
        download
      >
        <FontAwesomeIcon icon={faFilePdf} size={"4x"} />
      </a>
    </>
  );
}
