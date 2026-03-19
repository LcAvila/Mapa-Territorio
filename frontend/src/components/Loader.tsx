import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <div className="loader-wrapper flex items-center justify-center w-full h-full min-h-[400px]">
      <StyledWrapper>
        <div className="loader">
          <div className="cup">
            <div className="cup-handle" />
            <div className="smoke one" />
            <div className="smoke two" />
            <div className="smoke three" />
          </div>
          <div className="load">CARREGANDO...</div>
        </div>
      </StyledWrapper>
    </div>
  );
}

const StyledWrapper = styled.div`
  /* Base design from Uiverse.io by esraaabdel-kareem - Scaled up 1.8x */
  .loader {
    width: 180px;
    height: 180px;
    position: relative;
    animation: shake 3s infinite ease-in-out;
  }

  .cup {
    position: absolute;
    bottom: 36px;
    left: 50%;
    transform: translateX(-50%);
    width: 72px;
    height: 54px;
    background-color: #5b4022cb;
    border: 2px solid #2e2e2e;
    border-radius: 5px 5px 18px 18px;
    z-index: 1;
    animation: cupPulse 6s infinite ease-in-out;
  }

  .cup::before {
    content: "";
    position: absolute;
    bottom: -9px;
    width: calc(100% - 4px);
    height: 11px;
    background: #5b4022cb;
    border: 2px solid #2e2e2e;
    border-top: none;
    border-radius: 50%;
    z-index: -1;
    animation: cupPulse 6s infinite ease-in-out;
  }

  .cup::after {
    content: "";
    position: absolute;
    top: -4px;
    left: 2px;
    width: calc(100% - 4px);
    height: 7px;
    background: #da8920ca;
    border: 2px solid #2e2e2e;
    border-radius: 50%;
    animation: coffeeGlow 6s infinite ease-in-out;
  }

  .cup-handle {
    position: absolute;
    top: 9px;
    right: -18px;
    width: 18px;
    height: 27px;
    border: 4px solid #2e2e2e;
    border-left: none;
    border-radius: 0 18px 18px 0;
    background: transparent;
  }

  .smoke {
    position: absolute;
    bottom: 100%;
    left: 50%;
    width: 18px;
    height: 45px;
    /* Theme-aware smoke color */
    background: hsl(var(--foreground) / 0.15);
    border-radius: 50%;
    transform: translateX(-50%);
    animation: rise 3s infinite ease-in-out;
    filter: blur(8px);
  }

  .smoke.one {
    animation-delay: 0s;
  }
  .smoke.two {
    animation-delay: 0.8s;
  }
  .smoke.three {
    animation-delay: 1.6s;
  }

  .load {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    /* Theme-aware loading text */
    font-size: 16px;
    font-weight: 700;
    color: hsl(var(--foreground));
    opacity: 0.8;
    letter-spacing: 0.1em;
  }

  @keyframes rise {
    0% {
      transform: translate(-50%, 0) scale(0.4);
      opacity: 0;
    }
    30% {
      opacity: 0.7;
    }
    60% {
      opacity: 0.4;
    }
    100% {
      transform: translate(-50%, -180px) scale(1);
      opacity: 0;
    }
  }

  @keyframes shake {
    0% {
      transform: translateX(0) translateY(0) rotate(0);
    }
    25% {
      transform: translateX(-7px) translateY(-3px) rotate(-3deg);
    }
    50% {
      transform: translateX(0) translateY(0) rotate(0);
    }
    75% {
      transform: translateX(7px) translateY(-3px) rotate(3deg);
    }
    100% {
      transform: translateX(0) translateY(0) rotate(0);
    }
  }

  /* Animations */
  @keyframes cupPulse {
    0%,
    100% {
      background-color: #5b4022cb;
    }
    50% {
      background-color: #f5f5f5bd;
    }
  }

  @keyframes coffeeGlow {
    0%,
    100% {
      background: #da8920ca;
    }
    50% {
      background: #fed197d5;
    }
  }
`;

export default Loader;
