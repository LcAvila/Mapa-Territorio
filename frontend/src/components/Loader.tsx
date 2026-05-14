import React from 'react';
import styled from 'styled-components';

interface LoaderProps {
  label?: string;
}

const Loader = ({ label }: LoaderProps) => {
  return (
    <StyledWrapper>
      <div className="center-body flex-col gap-4">
        <div className="loader-shape-3" />
        {label && <p className="text-primary font-bold text-sm animate-pulse">{label}</p>}
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
  background: #202628;

  .center-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1rem;
  }
  
  .loader-shape-3 {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 50px;
  }
  
  .loader-shape-3:after {
    width: 30px;
    height: 20px;
    border-radius: 100%;
    background-color: rgba(255, 255, 255, 0.2);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin-top: 15px;
  }
  
  .loader-shape-3:before {
    width: 20px;
    height: 20px;
    border-radius: 100% 100% 100% 0;
    box-shadow: 0px 0px 0px 2px rgba(255, 255, 255, 1);
    animation: anm-SL-3-move 1s linear infinite;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-46deg);
    margin-top: 20px;
  }
  
  .loader-shape-3:before,
  .loader-shape-3:after {
    position: absolute;
    content: "";
  }
  
  @keyframes anm-SL-3-move {
    0% {
      top: 0;
    }
    50% {
      top: -5px;
    }
    100% {
      top: 0;
    }
  }
`;

export default Loader;
