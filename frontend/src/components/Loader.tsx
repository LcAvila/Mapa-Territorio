import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <div className="loader-wrapper flex items-center justify-center w-full h-full min-h-[400px]">
      <StyledWrapper>
        <div className="space-loader">
          <div className="sun" />
          <div className="orbit orbit-1">
            <div className="planet planet-1" />
          </div>
          <div className="orbit orbit-2">
            <div className="planet planet-2" />
          </div>
          <div className="orbit orbit-3">
            <div className="planet planet-3" />
          </div>
          <div className="loading-text">
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
  .space-loader {
    position: relative;
    width: 200px;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sun {
    position: absolute;
    width: 40px;
    height: 40px;
    background: hsl(var(--background));
    border: 2px solid hsl(var(--primary));
    border-radius: 50%;
    box-shadow: 0 0 40px hsl(var(--primary) / 0.4), 0 0 60px hsl(155, 45%, 50% / 0.3), 0 0 100px hsl(155, 45%, 30% / 0.2);
    z-index: 10;
  }

  .orbit {
    position: absolute;
    border: 1px solid hsl(var(--foreground) / 0.1);
    border-radius: 50%;
  }

  .orbit-1 { width: 100px; height: 100px; animation: rotate 4s linear infinite; }
  .orbit-2 { width: 150px; height: 150px; animation: rotate 7s linear infinite reverse; }
  .orbit-3 { width: 200px; height: 200px; animation: rotate 12s linear infinite; }

  .planet {
    position: absolute;
    border-radius: 50%;
  }

  .planet-1 {
    top: 50%;
    left: -6px;
    width: 12px;
    height: 12px;
    background: hsl(var(--primary));
    box-shadow: 0 0 15px hsl(var(--primary) / 0.6);
  }

  .planet-2 {
    top: 10px;
    right: 30px;
    width: 10px;
    height: 10px;
    background: hsl(var(--foreground));
    box-shadow: 0 0 12px hsl(var(--foreground) / 0.4);
  }

  .planet-3 {
    bottom: 20px;
    left: 20px;
    width: 8px;
    height: 8px;
    background: hsl(var(--muted-foreground));
    box-shadow: 0 0 10px hsl(var(--muted-foreground) / 0.4);
  }

  .loading-text {
    position: absolute;
    bottom: -60px;
    width: 100%;
    text-align: center;
    color: hsl(var(--foreground));
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .dots {
    display: flex;
    gap: 4px;
  }

  .dot {
    width: 3px;
    height: 3px;
    background: hsl(var(--foreground));
    border-radius: 50%;
    animation: dotPulse 1.5s infinite;
  }

  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes dotPulse {
    0%, 100% { opacity: 0.2; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.4); }
  }
`;

export default Loader;
