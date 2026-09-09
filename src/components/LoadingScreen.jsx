import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import './LoadingScreen.css';

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 25);

    return () => clearInterval(timer);
  }, []);

  const isDone = progress >= 100;

  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-card__border"></div>

        <div className="loading-top">
          <div className="loading-folder">
            <svg className="loading-folder__back" viewBox="0 0 50 40" fill="none">
              <path
                d="M0 4C0 1.79086 1.79086 0 4 0H16.524C17.721 0 18.8415 0.54051 19.574 1.4673L22.426 5.0654C23.1585 5.99219 24.279 6.5327 25.476 6.5327H46C48.2091 6.5327 50 8.32356 50 10.5327V36C50 38.2091 48.2091 40 46 40H4C1.79086 40 0 38.2091 0 36V4Z"
                fill="currentColor"
              />
            </svg>

            <svg className="loading-folder__front" viewBox="0 0 50 34" fill="none">
              <path
                d="M0 4C0 1.79086 1.79086 0 4 0H46C48.2091 0 50 1.79086 50 4V30C50 32.2091 48.2091 34 46 34H4C1.79086 34 0 32.2091 0 30V4Z"
                fill="currentColor"
              />
            </svg>

            <div className="loading-label">LOVE</div>
          </div>

          <div className="loading-content">
            <h2>LoveNotes</h2>
            <span>Sedang memuat...</span>
          </div>
        </div>

        <div className="loading-upload-box">
          <div className="loading-upload-head">
            <div className="loading-status">
              <div className={`loading-loader ${isDone ? 'done' : ''}`}>
                {isDone && <Check />}
              </div>
              <p>{isDone ? 'Siap' : 'Memuat...'}</p>
            </div>
            <h1 className="loading-percent">{progress}%</h1>
          </div>

          <div className="loading-progress">
            <div className="loading-bar" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
