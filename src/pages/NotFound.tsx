import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { MapPin, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <StyledWrapper>
      {/* Two-column layout: TV left, info right */}
      <div className="layout">
        {/* Left: TV */}
        <div className="tv_col">
          <div className="brand">
            <MapPin size={16} />
            <span>Territórios de Vendas</span>
          </div>
          <div className="main_wrapper">
            <div className="main">
              <div className="antenna">
                <div className="antenna_shadow" />
                <div className="a1" />
                <div className="a1d" />
                <div className="a2" />
                <div className="a2d" />
                <div className="a_base" />
              </div>
              <div className="tv">
                <div className="cruve">
                  <svg className="curve_svg" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 189.929 189.929" xmlSpace="preserve">
                    <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13
        C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
                  </svg>
                </div>
                <div className="display_div">
                  <div className="screen_out">
                    <div className="screen_out1">
                      <div className="screen">
                        <span className="notfound_text"> NOT FOUND</span>
                      </div>
                      <div className="screenM">
                        <span className="notfound_text"> NOT FOUND</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lines">
                  <div className="line1" />
                  <div className="line2" />
                  <div className="line3" />
                </div>
                <div className="buttons_div">
                  <div className="b1"><div /></div>
                  <div className="b2" />
                  <div className="speakers">
                    <div className="g1">
                      <div className="g11" />
                      <div className="g12" />
                      <div className="g13" />
                    </div>
                    <div className="g" />
                    <div className="g" />
                  </div>
                </div>
              </div>
              <div className="bottom">
                <div className="base1" />
                <div className="base2" />
                <div className="base3" />
              </div>
            </div>
            <div className="text_404">
              <div className="text_4041">4</div>
              <div className="text_4042">0</div>
              <div className="text_4043">4</div>
            </div>
          </div>{/* end main_wrapper */}
        </div>{/* end tv_col */}

        {/* Right: Info */}
        <div className="info_section">
          <h1 className="title">Página não encontrada</h1>
          <p className="subtitle">
            A rota que você tentou acessar não existe ou foi removida.<br />
            Verifique o endereço ou volte ao mapa principal.
          </p>

          <div className="suggestions">
            <p className="suggestions_title">O que você pode fazer:</p>
            <ul>
              <li>Verificar se o endereço digitado está correto</li>
              <li>Voltar para o mapa de territórios</li>
              <li>Entrar em contato com o administrador do sistema</li>
            </ul>
          </div>

          <div className="actions">
            <button className="btn_primary" onClick={() => navigate('/')}>
              <Home size={16} /> Ir para o Mapa
            </button>
            <button className="btn_secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Voltar
            </button>
          </div>

          <p className="error_code">Código do erro: <code>HTTP 404</code></p>
        </div>{/* end info_section */}
      </div>{/* end layout */}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: hsl(220, 20%, 8%);
  background-image: radial-gradient(ellipse at 60% 50%, hsl(220, 20%, 13%) 0%, transparent 70%);
  font-family: 'Space Grotesk', sans-serif;
  padding: 0 2rem;

  .layout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    width: 100%;
    max-width: 1000px;
  }

  .tv_col {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: hsl(168, 70%, 45%);
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
    opacity: 0.8;
  }

  /* ── TV scaled to 1.1x ── */
  .main_wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30em;
    height: 30em;
    transform: scale(1.1);
    transform-origin: center center;
  }

  .main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 5em;
  }

  .antenna {
    width: 5em; height: 5em;
    border-radius: 50%;
    border: 2px solid black;
    background-color: #f27405;
    margin-bottom: -6em;
    z-index: -1;
  }
  .antenna_shadow {
    position: absolute;
    background-color: transparent;
    width: 50px; height: 56px;
    margin-left: 1.68em;
    border-radius: 45%;
    transform: rotate(140deg);
    border: 4px solid transparent;
    box-shadow: inset 0px 16px #a85103, inset 0px 16px 1px 1px #a85103;
    -moz-box-shadow: inset 0px 16px #a85103, inset 0px 16px 1px 1px #a85103;
  }
  .antenna::after {
    content: "";
    position: absolute;
    margin-top: -9.4em; margin-left: 0.4em;
    transform: rotate(-25deg);
    width: 1em; height: 0.5em;
    border-radius: 50%;
    background-color: #f69e50;
  }
  .antenna::before {
    content: "";
    position: absolute;
    margin-top: 0.2em; margin-left: 1.25em;
    transform: rotate(-20deg);
    width: 1.5em; height: 0.8em;
    border-radius: 50%;
    background-color: #f69e50;
  }
  .a1 {
    position: relative; top: -102%; left: -130%;
    width: 12em; height: 5.5em;
    border-radius: 50px;
    background-image: linear-gradient(#171717,#171717,#353535,#353535,#171717);
    transform: rotate(-29deg);
    clip-path: polygon(50% 0%, 49% 100%, 52% 100%);
  }
  .a1d {
    position: relative; top: -211%; left: -35%;
    transform: rotate(45deg);
    width: 0.5em; height: 0.5em;
    border-radius: 50%;
    border: 2px solid black;
    background-color: #979797;
    z-index: 99;
  }
  .a2 {
    position: relative; top: -210%; left: -10%;
    width: 12em; height: 4em;
    border-radius: 50px;
    background-image: linear-gradient(#171717,#171717,#353535,#353535,#171717);
    margin-right: 5em;
    clip-path: polygon(47% 0,47% 0,34% 34%,54% 25%,32% 100%,29% 96%,49% 32%,30% 38%);
    transform: rotate(-8deg);
  }
  .a2d {
    position: relative; top: -294%; left: 94%;
    width: 0.5em; height: 0.5em;
    border-radius: 50%;
    border: 2px solid black;
    background-color: #979797;
    z-index: 99;
  }

  .notfound_text {
    background-color: black;
    padding-left: 0.3em; padding-right: 0.3em;
    font-size: 0.75em;
    color: white;
    letter-spacing: 0;
    border-radius: 5px;
    z-index: 10;
  }
  .tv {
    width: 17em; height: 9em;
    margin-top: 3em;
    border-radius: 15px;
    background-color: #d36604;
    display: flex;
    justify-content: center;
    border: 2px solid #1d0e01;
    box-shadow: inset 0.2em 0.2em #e69635;
  }
  .tv::after {
    content: "";
    position: absolute;
    width: 17em; height: 9em;
    border-radius: 15px;
    background: repeating-radial-gradient(#d36604 0 0.0001%,#00000070 0 0.0002%) 50% 0/2500px 2500px,
      repeating-conic-gradient(#d36604 0 0.0001%,#00000070 0 0.0002%) 60% 60%/2500px 2500px;
    background-blend-mode: difference;
    opacity: 0.09;
  }
  .curve_svg { position: absolute; margin-top: 0.25em; margin-left: -0.25em; height: 12px; width: 12px; }
  .display_div {
    display: flex;
    align-items: center; align-self: center; justify-content: center;
    border-radius: 15px;
    box-shadow: 3.5px 3.5px 0px #e69635;
  }
  .screen_out { width: auto; height: auto; border-radius: 10px; }
  .screen_out1 {
    width: 11em; height: 7.75em;
    display: flex;
    align-items: center; justify-content: center;
    border-radius: 10px;
  }
  .screen {
    width: 13em; height: 7.85em;
    font-family: Montserrat;
    border: 2px solid #1d0e01;
    background: repeating-radial-gradient(#000 0 0.0001%,#ffffff 0 0.0002%) 50% 0/2500px 2500px,
      repeating-conic-gradient(#000 0 0.0001%,#ffffff 0 0.0002%) 60% 60%/2500px 2500px;
    background-blend-mode: difference;
    animation: b 0.2s infinite alternate;
    border-radius: 10px; z-index: 99;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; color: #252525; letter-spacing: 0.15em; text-align: center;
  }
  .screenM {
    width: 13em; height: 7.85em;
    position: relative; font-family: Montserrat;
    background: linear-gradient(to right,#002fc6 0%,#002bb2 14.28%,#3a3a3a 14.28%,#303030 28.57%,#ff0afe 28.57%,#f500f4 42.85%,#6c6c6c 42.85%,#626262 57.14%,#0affd9 57.14%,#00f5ce 71.42%,#3a3a3a 71.42%,#303030 85.71%,white 85.71%,#fafafa 100%);
    border-radius: 10px; border: 2px solid black; z-index: 99;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; color: #252525; letter-spacing: 0.15em; text-align: center;
    overflow: hidden;
  }
  .screenM:before, .screenM:after { content: ""; position: absolute; left: 0; z-index: 1; width: 100%; }
  .screenM:before {
    top: 0; height: 68.47%;
    background: linear-gradient(to right,white 0%,#fafafa 14.28%,#ffe60a 14.28%,#f5dc00 28.57%,#0affd9 28.57%,#00f5ce 42.85%,#10ea00 42.85%,#0ed600 57.14%,#ff0afe 57.14%,#f500f4 71.42%,#ed0014 71.42%,#d90012 85.71%,#002fc6 85.71%,#002bb2 100%);
  }
  .screenM:after {
    bottom: 0; height: 21.73%;
    background: linear-gradient(to right,#006c6b 0%,#005857 16.66%,white 16.66%,#fafafa 33.33%,#001b75 33.33%,#001761 50%,#6c6c6c 50%,#626262 66.66%,#929292 66.66%,#888888 83.33%,#3a3a3a 83.33%,#303030 100%);
  }
  @keyframes b { 100% { background-position: 50% 0, 60% 50%; } }

  .lines { display: flex; column-gap: 0.1em; align-self: flex-end; }
  .line1, .line3 { width: 2px; height: 0.5em; background-color: black; border-radius: 25px 25px 0 0; margin-top: 0.5em; }
  .line2 { flex-grow: 1; width: 2px; height: 1em; background-color: black; border-radius: 25px 25px 0 0; }

  .buttons_div {
    width: 4.25em; align-self: center; height: 8em;
    background-color: #e69635; border: 2px solid #1d0e01;
    padding: 0.6em; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; row-gap: 0.75em;
    box-shadow: 3px 3px 0px #e69635;
  }
  .b1 {
    width: 1.65em; height: 1.65em; border-radius: 50%;
    background-color: #7f5934; border: 2px solid black;
    box-shadow: inset 2px 2px 1px #b49577, -2px 0px #513721, -2px 0px 0px 1px black;
  }
  .b1::before { content: ""; position: absolute; margin-top: 1em; margin-left: 0.5em; transform: rotate(47deg); border-radius: 5px; width: 0.1em; height: 0.4em; background-color: #000; }
  .b1::after  { content: ""; position: absolute; margin-top: 0.9em; margin-left: 0.8em; transform: rotate(47deg); border-radius: 5px; width: 0.1em; height: 0.55em; background-color: #000; }
  .b1 div { content: ""; position: absolute; margin-top: -0.1em; margin-left: 0.65em; transform: rotate(45deg); width: 0.15em; height: 1.5em; background-color: #000; }
  .b2 {
    width: 1.65em; height: 1.65em; border-radius: 50%;
    background-color: #7f5934; border: 2px solid black;
    box-shadow: inset 2px 2px 1px #b49577, -2px 0px #513721, -2px 0px 0px 1px black;
  }
  .b2::before { content: ""; position: absolute; margin-top: 1.05em; margin-left: 0.8em; transform: rotate(-45deg); border-radius: 5px; width: 0.15em; height: 0.4em; background-color: #000; }
  .b2::after  { content: ""; position: absolute; margin-top: -0.1em; margin-left: 0.65em; transform: rotate(-45deg); width: 0.15em; height: 1.5em; background-color: #000; }

  .speakers { display: flex; flex-direction: column; row-gap: 0.5em; }
  .speakers .g1 { display: flex; column-gap: 0.25em; }
  .speakers .g1 .g11, .g12, .g13 { width: 0.65em; height: 0.65em; border-radius: 50%; background-color: #7f5934; border: 2px solid black; box-shadow: inset 1.25px 1.25px 1px #b49577; }
  .speakers .g { width: auto; height: 2px; background-color: #171717; }

  .bottom { width: 100%; height: auto; display: flex; align-items: center; justify-content: center; column-gap: 8.7em; }
  .base1, .base2 { height: 1em; width: 2em; border: 2px solid #171717; background-color: #4d4d4d; margin-top: -0.15em; z-index: -1; }
  .base3 { position: absolute; height: 0.15em; width: 17.5em; background-color: #171717; margin-top: 0.8em; }

  .text_404 {
    position: absolute;
    display: flex; flex-direction: row;
    column-gap: 6em; z-index: -5;
    margin-bottom: 2em;
    align-items: center; justify-content: center;
    opacity: 0.4;
    font-family: Montserrat;
    color: hsl(210, 20%, 80%);
  }
  .text_4041, .text_4042, .text_4043 { transform: scaleY(24.5) scaleX(9); }

  /* ── Info section (right column) ── */
  .info_section {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 0.85rem;
    max-width: 400px;
    flex: 1;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(210, 20%, 92%);
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .subtitle {
    font-size: 0.875rem;
    color: hsl(215, 12%, 55%);
    line-height: 1.65;
    margin: 0;
  }

  .suggestions {
    background: hsl(220, 18%, 13%);
    border: 1px solid hsl(220, 15%, 20%);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    text-align: left;
    width: 100%;
  }
  .suggestions_title {
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(168, 70%, 45%);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 0.5rem;
  }
  .suggestions ul {
    margin: 0;
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .suggestions li {
    font-size: 0.85rem;
    color: hsl(215, 12%, 60%);
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .btn_primary {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.55em 1.3em;
    background: hsl(168, 70%, 45%);
    color: hsl(220, 20%, 8%);
    border: none; border-radius: 8px;
    font-size: 0.88rem; font-weight: 700;
    cursor: pointer; transition: opacity 0.2s;
    font-family: inherit;
  }
  .btn_primary:hover { opacity: 0.85; }

  .btn_secondary {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.55em 1.3em;
    background: transparent;
    color: hsl(215, 12%, 60%);
    border: 1px solid hsl(220, 15%, 22%);
    border-radius: 8px;
    font-size: 0.88rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    font-family: inherit;
  }
  .btn_secondary:hover { background: hsl(220, 15%, 16%); color: hsl(210, 20%, 85%); }

  .error_code {
    font-size: 0.75rem;
    color: hsl(215, 12%, 40%);
    margin: 0;
  }
  .error_code code {
    font-family: 'JetBrains Mono', monospace;
    color: hsl(0, 65%, 55%);
    background: hsl(0, 20%, 13%);
    padding: 1px 6px;
    border-radius: 4px;
  }

  @media only screen and (max-width: 495px) { .text_404 { column-gap: 6em; } }
  @media only screen and (max-width: 395px) {
    .text_404 { column-gap: 4em; }
    .text_4041, .text_4042, .text_4043 { transform: scaleY(25) scaleX(8); }
    .main_wrapper { transform: scale(1.1); }
  }
  @media (max-width: 275px), (max-height: 520px) { .main { position: relative; } }
  @media only screen and (max-width: 1024px) { .screenM { display: flex; } .screen { display: none; } }
  @media only screen and (min-width: 1025px) { .screen { display: flex; } .screenM { display: none; } }
`;

export default NotFound;
