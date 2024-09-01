/**
 * app/fetch_ask_questions_files/page.tsx
 * Fetch ask questions files page for the Quizz.It application
 * @SXV357
 * 08-24-2024
 */
"use client"
import React, { useState, useEffect } from "react";
import "../../styles/answering.css";
import "../../styles/selection.css";
import { useRouter } from "next/router";

export default function QAnsweringSelection() {
  const [questionAnsweringFiles, setQuestionAnsweringFiles] = useState([]);
  const [qaFileSelectionStatus, setQaFileSelectionStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);

  const username = sessionStorage.getItem("username");

  const router = useRouter()

  useEffect(() => {
    fetch(`${window.location.origin}/api/fetch_files?username=${username}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => setQuestionAnsweringFiles(data.files));
  }, []);

  const selectFile = (e: React.MouseEvent) => {
    e.preventDefault();

    if (selectedFile === "") {
      setQaFileSelectionStatus("You need to select a file!");
      return;
    }

    setQaFileSelectionStatus(
      "Please wait as the document is being processed..."
    );
    setIsDisabled(true);

    fetch(
      `${window.location.origin}/api/signal_doc_qa_selection?file=${selectedFile}&username=${username}`,
      {
        method: "POST",
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "OK") {
          setIsDisabled(false);
          setQaFileSelectionStatus("");
          router.push("/chatbot_page");
        }
      });
  };

  return (
    <>
      <div id="container">
        <h2>Document Q/A File Selection</h2>
        <form id="questionForm">
          <label htmlFor="askQuestionFileSelect">
            Select a file that you would like to ask questions about
          </label>
          <select
            id="askQuestionFileSelect"
            name="askQuestionFileSelect"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            disabled={isDisabled}
            onFocus={() => setQaFileSelectionStatus("")}
          >
            <option value="" disabled>
              Select a file
            </option>
            {questionAnsweringFiles.map((file, idx) => {
              return (
                <option key={idx} value={file}>
                  {file}
                </option>
              );
            })}
          </select>
          <button
            type="button"
            id="btn"
            onClick={(e) => selectFile(e)}
            disabled={isDisabled}
          >
            Chat about this file
          </button>
        </form>
        <button
          id="toHomePage"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            router.push("/app");
          }}
          disabled={isDisabled}
        >
          Go To Home Page
        </button>
        <div className="status" style={{ textAlign: "center" }}>
          {qaFileSelectionStatus}
        </div>
      </div>
    </>
  );
}
