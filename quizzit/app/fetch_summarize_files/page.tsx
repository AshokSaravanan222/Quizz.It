/**
 * app/fetch_summarize_files/page.tsx
 * Fetch and summarize files page for the Quizz.It application
 * @SXV357
 * 08-24-2024
 */
"use client"
import React, { useState, useEffect } from "react";
import "../../styles/summary.css";
import "../../styles/selection.css";
import { useRouter } from "next/navigation";

type Data = {
    summarized_text: Array<[string, string]>; // Changed to match the inferred type from the code
    statistics: Record<string, string>; // Changed to represent an object with string keys and string values
  };

export default function SummarySelection() {
  const [summarizeFiles, setSummarizeFiles] = useState([]);
  const [summarizeFileStatus, setSummarizeFileStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState("");

  const router = useRouter();
  const username = sessionStorage.getItem("username");

  useEffect(() => {
    fetch(`${window.location.origin}/api/fetch_files?username=${username}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => setSummarizeFiles(data.files));
  }, []);

  const summarize = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (selectedFile === "") {
      setSummarizeFileStatus("You need to select a file!");
      return;
    }

    setSummarizeFileStatus("Loading...");

    try {
      fetch(
        `${window.location.origin}/api/generate_summary?username=${username}&file=${selectedFile}`,
        {
          method: "GET",
        }
      )
        .then((res) => res.json())
        .then((data: Data) => {
          setSummarizeFileStatus("");
            sessionStorage.setItem("summarized_text", JSON.stringify(data.summarized_text));
          router.push("/summary_page"); // fix this, parse before sending
        });
    } catch (error) {
      setSummarizeFileStatus(
        "An error occurred when generating the summary. Please tagain"
      );
    }
  };

  return (
    <div id="container">
      <h2>Document Summary Selection</h2>
      <form id="questionForm">
        <label htmlFor="summarizeFileSelect">
          Select a File That You Would Like to Summarize:
        </label>
        <select
          id="summarizeFileSelect"
          name="summarizeFileSelect"
          disabled={summarizeFileStatus === "Loading..."}
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          onFocus={() => setSummarizeFileStatus("")}
        >
          <option value="" disabled>
            Select a file
          </option>
          {summarizeFiles.map((file, idx) => {
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
          onClick={(e) => summarize(e)}
          disabled={summarizeFileStatus === "Loading..."}
        >
          Summarize This File
        </button>
      </form>
      <button
        id="toHomePage"
        disabled={summarizeFileStatus === "Loading..."}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          router.push("/app");
        }}
      >
        Go to Home Page
      </button>
      <div className="status">{summarizeFileStatus}</div>
    </div>
  );
}
