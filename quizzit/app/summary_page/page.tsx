/**
 * app/summary_page/page.tsx
 * Summary page for the Quizz.It application
 * @SXV357
 * 08-24-2024
 */
"use client"
import React from "react";
import "./styles/summary.css";
import "./styles/selection.css";
import { useRouter } from "next/navigation";

type Data = {
    summarized_text: Array<[string, string]>; // Changed to match the inferred type from the code
    statistics: Record<string, string>; // Changed to represent an object with string keys and string values
  };


export default function SummaryPage() {
    const router = useRouter()
    const data = sessionStorage.getItem("summarized_text");
    const parsedData = JSON.parse(data ?? "{}") as Data;
    const summarized_text = parsedData.summarized_text;
    const statistics = parsedData.statistics;

    return (
        <>
            <section id="summarizeSection">
                <div className="summary">
                    <h2>Here is a summary of your document:</h2>
                    <div>
                        <div className="summary_text">
                            {summarized_text.map((pair, idx) => {
                                return (
                                    <section key={idx}>
                                        <p>Summary for {pair[0]}</p>
                                        <br />
                                        <p>{pair[1]}</p>
                                        <br />
                                    </section>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="stats">
                    <h2>Here are some statistics about your document:</h2>
                    <ul>
                        {Object.entries(statistics).map((pair, idx) => {
                            return (
                                <li key={idx}>
                                    {pair[0]}: {pair[1]}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <button
                    id="toHomePage"
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        router.push("/app");
                    }}
                >
                    Go to Home Page
                </button>
            </section>
        </>
    );
}
