import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <div className="loader-wrapper flex items-center justify-center w-full h-full min-h-[500px]">
      <StyledWrapper>
        <div className="loader-container">
          <div className="hole-wrapper">
            <div className="ring-3">
              <div className="ring-2">
                <div className="ring-1">
                  <div className="black-hole" />
                  <div className="glow" />
                </div>
              </div>
            </div>
            <div className="crescent-container">
              <svg className="crescent crescent-1" viewBox="0 0 50 50">
                <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
              </svg>
              <svg className="crescent crescent-2" viewBox="0 0 50 50">
                <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
              </svg>
              <svg className="crescent crescent-3" viewBox="0 0 50 50">
                <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
              </svg>
              <svg className="crescent crescent-4" viewBox="0 0 50 50">
                <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
              </svg>
              <svg className="crescent crescent-5" viewBox="0 0 50 50">
                <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
              </svg>
              <svg className="crescent crescent-6" viewBox="0 0 50 50">
                <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
              </svg>
            </div>
          </div>
          <div className="loading-label">
            <span>Sincronizando Dados</span>
            <div className="dots">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          </div>
        </div>
      </StyledWrapper>
    </div>
  );
}

const StyledWrapper = styled.div`
  .loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .hole-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 300px;
    height: 300px;
  }

  .ring-3 {
    box-shadow: 0px 0px 10px 15px #fff;
    border-radius: 50%;
    padding: 2px;
    z-index: 2;
  }
  .ring-2 {
    box-shadow: 0px 0px 2px 10px #000;
    border-radius: 50%;
    padding: 2px;
  }
  .ring-1 {
    box-shadow: 0px 0px 10px 15px #fff;
    border-radius: 50%;
    padding: 2px;
  }
  .black-hole {
    height: 128px;
    aspect-ratio: 1;
    background-color: black;
    border-radius: 50%;
    box-shadow: 
      0px 0px 20px 10px #000, 
      inset 0px 0px 10px #ffffff88;
  }
  .glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 350px;
    height: 350px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.2) 5%,
      rgba(255, 255, 255, 0.1) 20%,
      rgba(255, 255, 255, 0) 70%
    );
    border-radius: 50%;
    z-index: -1;
  }
  .crescent-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotateX(75deg);
    z-index: 1;
  }
  .crescent {
    filter: drop-shadow(0px 0px 5px #fff) drop-shadow(0px 0px 15px #fff) 
      drop-shadow(0px 0px 25px #fff) drop-shadow(0px 0px 50px #fff);
    position: absolute;
    color: transparent !important;
    top: 50%;
    left: 50%;
    transform: rotate(180deg);
    width: 300px; /* Aumentado de 200px para 300px */
    height: 15px; /* Aumentado de 12px para 15px */
    clip-path: ellipse(60% 100% at 100% 50%);
    offset-path: path("M 0,-130 A 130,130 0 1,1 0,130 A 130,130 0 1,1 0,-130 Z"); /* Aumentado raio de 100 para 130 */
    offset-distance: 0%;
    opacity: 0;
  }

  .crescent-1 { animation: moveOval 500ms ease-in-out 0ms infinite; }
  .crescent-2 { animation: moveOval 500ms ease-in-out 83ms infinite; }
  .crescent-3 { animation: moveOval 500ms ease-in-out 167ms infinite; }
  .crescent-4 { animation: moveOval 500ms ease-in-out 250ms infinite; }
  .crescent-5 { animation: moveOval 500ms ease-in-out 333ms infinite; }
  .crescent-6 { animation: moveOval 500ms ease-in-out 417ms infinite; }

  @keyframes moveOval {
    18% { offset-distance: 25%; opacity: 0; }
    25% { opacity: 1; }
    75% { opacity: 1; }
    100% { offset-distance: 90%; opacity: 0; }
  }

  .loading-label {
    margin-top: 50px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    z-index: 10;
  }

  .loading-label span {
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: white;
    text-shadow: 0 0 10px rgba(255,255,255,0.5);
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 10px white;
    animation: dotPulse 1.5s infinite ease-in-out;
  }

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dotPulse {
    0%, 100% { transform: scale(0.8); opacity: 0.3; }
    50% { transform: scale(1.2); opacity: 1; }
  }
`;

export default Loader;
