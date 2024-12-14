import React, { useState, useEffect } from 'react';
import ReactDOM from "react-dom"
import Leaderboard from "./LeaderboardComp"
import 'ag-grid-enterprise'

import "./index.css"

import mockDataComplete from "./mocks/code_complete.json"

import 'ag-grid-enterprise'

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

const LeaderboardTabs = () => {
  // State to track the currently selected tab
  const [activeTab, setActiveTab] = useState('tab1');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFirstTable, setShowFirstTable] = useState(true);
  const [buttonText, setButtonText] = useState('Show in group?');
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleShowFirstTable = () => {
    setShowFirstTable(!showFirstTable);
    setButtonText(showFirstTable ? 'Show in lines?' : 'Show in groups?');
  };

  // Function to render the leaderboard based on the selected tab
  const renderLeaderboard = () => {
    // console.log(activeTab);
    switch (activeTab) {
      case 'tab1':
        switch (showFirstTable) {
          case true:
            return <Leaderboard theme={{ base: "light" }} args={[mockDataComplete, "lines"]} />;
          case false:
            return <Leaderboard theme={{ base: "light" }} args={[mockDataComplete, "groups"]} />;
        }
      default:
        return <div>Select a tab</div>;
    }
  };
  return (
    <div className="tabs-container">
      <Stack direction="row" spacing={2}>
        {/* <Button onClick={() => setShowFirstTable(!showFirstTable)}>Show in groups?</Button> */}
        {/* <Button onClick={toggleShowFirstTable}>{buttonText}</Button> */}
        <Button variant="contained" onClick={toggleShowFirstTable}>{buttonText}</Button>
      </Stack>

      <div className="tab-content">
        {renderLeaderboard()}
      </div>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <section className="hero">
      <div className="hero-body">
        <div className="container is-fluid">
          <div className="columns  is-fullwidth is-fullheight">
            <div style={{ backgroundColor: 'lightorange', width: '100%', height: '100%' }}>
            <div className="column has-text-centered is-fullwidth">
              {/* <h1 className="title is-1 publication-title">
                ⚔️CodeArena: Real-world Coding Tasks<br />Aligning Human Preferences and Model Generation
              </h1> */}
              <h1 className="title publication-title" style={{ fontSize: '2.5rem' }}>⚙️ExecRepoBench</h1>
              {/* <h2 className="title is-3 publication-title">Real-world Coding Tasks</h2> */}
              <h2 className="title is-3 publication-title">Executable Code Completion</h2>
              <h2 className="title is-3 publication-title">Evaluation with Code Large Language Models</h2>
            <div className="is-4 publication-authors">
              <span className="is-4 publication-title-Cinzel">
                <a href="">Jian Yang</a><sup>1</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Jiajun Zhang</a><sup>1</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Jiaxi Yang</a><sup>2</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Ke Jin</a><sup></sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Lei Zhang</a><sup>2</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Qiyao Peng</a><sup>3</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Ken Deng</a><sup></sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Tianyu Liu</a><sup>1</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Zeyu Cui</a><sup>1</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Binyuan Hui</a><sup>1</sup>,</span>
              <span className="is-4 publication-title-Cinzel">
                <a href="">Junyang Lin</a><sup>1</sup>,</span>
            </div>

            <div className="is-4 publication-authors">
              <span className="is-4 publication-title-Cinzel"><sup>1</sup>Alibaba Group;</span>
              <span className="is-4 publication-title-Cinzel"><sup>2</sup>University of Chinese Academy of Sciences;</span>
              <span className="is-4 publication-title-Cinzel"><sup>3</sup>Tianjin University;</span>
            </div>

              <div className="column has-text-centered">
                <div className="publication-links">
                  <span className="link-block">
                    <a href=""
                      className="external-link button is-large is-rounded is-dark">
                      <span className="icon">
                        <i className="fas fa-file-pdf "></i>
                      </span>
                      <span className='publication-title-Cinzel'>Paper</span>
                    </a>
                  </span>
                  <span className="spacer"></span>
                  <span className="link-block">
                    <a href="https://github.com/QwenLM/Qwen2.5-Coder/tree/main/qwencoder-eval/instruct/CodeArena"
                      className="external-link button is-large is-rounded is-dark">
                      <span className="icon">
                        <i className="fab fa-github"></i>
                      </span>
                      <span className='publication-title-Cinzel'>Code</span>
                    </a>
                  </span>
                  <span className="spacer"></span>
                  <span className="link-block">
                    <a href="https://huggingface.co/datasets/CSJianYang/CodeArena"
                      className="external-link button is-large is-rounded is-dark">
                      <span className="icon">
                        <i className="far fa-images"></i>
                      </span>
                      <span  className='publication-title-Cinzel'>Evaluation Data</span>
                    </a>
                  </span>
                  <span className="spacer"></span>
                  <span className="link-block">
                    <a
                      href="https://ali-codearena.github.io/Ali-CodeArena/"
                      className="external-link button is-large is-rounded is-dark"
                    >
                      <span className="icon">
                        <i className="fas fa-home"></i>
                      </span>
                      <span  className='publication-title-Cinzel'>Home</span>
                    </a>
                  </span>
                </div>
              </div>
              </div>
              <div className="column has-text-centered is-fullheight" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <LeaderboardTabs />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </React.StrictMode>,
  document.getElementById("root")
)