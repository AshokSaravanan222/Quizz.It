import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';
import { BrowserRouter, Routes, Route } from "react-router-dom"
import App from './App';
import SummarySelection from './SummarySelection';
import QGenerationSelection from "./QGenerationSelection"
import QAnsweringSelection from "./QAnsweringSelection"

const root = ReactDOM.createRoot(document.getElementById('root'));

const routes = [{path: "/", component: <App />}, 
                {path: "/fetch_summarize_files", component: <SummarySelection />},
                {path: "/fetch_questions_files", component: <QGenerationSelection />},
                {path: "/fetch_ask_questions_files", component: <QAnsweringSelection />}]

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {routes.map((route, idx) => {
          return <Route key = {idx} exact path = {route.path} element = {route.component}/>
        })}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);