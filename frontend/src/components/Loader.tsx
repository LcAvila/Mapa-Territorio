import React from 'react';
import styled from 'styled-components';

interface LoaderProps {
  label?: string;
}

const Loader = ({ label }: LoaderProps) => {
  return (
    <StyledWrapper>
      <div className="loader-shell">
        <span className="ambient-glow ambient-glow-1" aria-hidden="true" />
        <span className="ambient-glow ambient-glow-2" aria-hidden="true" />
        <div className="pin-wrap" aria-hidden="true">
          <span className="ripple ripple-1" />
          <span className="ripple ripple-2" />
          <span className="pin-shadow" />
          <span className="pin-head">
            <span className="pin-core" />
          </span>
        </div>
        {label && <p className="loader-label">{label}</p>}
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  background: radial-gradient(circle at 50% 35%, #29363b 0%, #1d2528 55%, #151b1d 100%);

  .loader-shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-width: 240px;
    padding: 1.2rem 1rem;
    position: relative;
  }

  .ambient-glow {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(18px);
  }

  .ambient-glow-1 {
    width: 160px;
    height: 74px;
    background: radial-gradient(circle, rgba(83, 242, 199, 0.25) 0%, rgba(83, 242, 199, 0.04) 70%, transparent 100%);
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    animation: glowBreath 2.2s ease-in-out infinite;
  }

  .ambient-glow-2 {
    width: 120px;
    height: 50px;
    background: radial-gradient(circle, rgba(92, 229, 255, 0.2) 0%, rgba(92, 229, 255, 0.03) 70%, transparent 100%);
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    animation: glowBreath 2.2s ease-in-out infinite 0.8s;
  }

  .pin-wrap {
    position: relative;
    width: 84px;
    height: 82px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pin-shadow {
    position: absolute;
    bottom: 8px;
    left: 50%;
    width: 36px;
    height: 12px;
    border-radius: 999px;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.35);
    filter: blur(1px);
    animation: shadowPulse 1.45s ease-in-out infinite;
  }

  .pin-head {
    position: relative;
    width: 34px;
    height: 34px;
    border-radius: 60% 60% 60% 0;
    transform: translateY(-2px) rotate(-45deg);
    border: 2px solid rgba(95, 245, 201, 0.98);
    background: linear-gradient(150deg, rgba(95, 245, 201, 0.38) 0%, rgba(61, 206, 167, 0.14) 75%);
    box-shadow:
      0 0 0 1px rgba(95, 245, 201, 0.25),
      0 8px 24px rgba(65, 226, 185, 0.22);
    animation: pinFloat 1.45s cubic-bezier(0.4, 0.05, 0.2, 0.95) infinite;
  }

  .pin-core {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transform: translate(-50%, -50%) rotate(45deg);
    background: rgba(204, 255, 242, 0.96);
    box-shadow: 0 0 12px rgba(151, 255, 226, 0.65);
  }

  .ripple {
    position: absolute;
    bottom: 4px;
    left: 50%;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    transform: translateX(-50%);
    border: 1.5px solid rgba(105, 245, 207, 0.65);
    opacity: 0;
  }

  .ripple-1 {
    animation: ripple 1.8s ease-out infinite;
  }

  .ripple-2 {
    animation: ripple 1.8s ease-out infinite 0.9s;
  }

  .loader-label {
    margin: 0;
    color: rgba(224, 245, 241, 0.92);
    font-size: 0.84rem;
    font-weight: 600;
    letter-spacing: 0.015em;
    text-align: center;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
    animation: labelFade 1.6s ease-in-out infinite;
  }

  @keyframes pinFloat {
    0% {
      transform: translateY(0) rotate(-45deg);
    }
    50% {
      transform: translateY(-7px) rotate(-45deg);
    }
    100% {
      transform: translateY(0) rotate(-45deg);
    }
  }

  @keyframes shadowPulse {
    0% {
      transform: translateX(-50%) scaleX(1);
      opacity: 0.42;
    }
    50% {
      transform: translateX(-50%) scaleX(0.8);
      opacity: 0.24;
    }
    100% {
      transform: translateX(-50%) scaleX(1);
      opacity: 0.42;
    }
  }

  @keyframes ripple {
    0% {
      width: 12px;
      height: 12px;
      opacity: 0.55;
    }
    100% {
      width: 60px;
      height: 60px;
      opacity: 0;
    }
  }

  @keyframes glowBreath {
    0% {
      opacity: 0.4;
      transform: translateX(-50%) scale(0.95);
    }
    50% {
      opacity: 0.9;
      transform: translateX(-50%) scale(1.04);
    }
    100% {
      opacity: 0.4;
      transform: translateX(-50%) scale(0.95);
    }
  }

  @keyframes labelFade {
    0% {
      opacity: 0.72;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.72;
    }
  }
`;

export default Loader;
