import "./BlockchainLoader.css";

export default function BlockchainLoader({ message = "블록체인에 업로드 중..." }) {
  return (
    <div className="blockchain-loader-overlay">
      <div className="blockchain-loader-content">
        <div className="blockchain-animation">
          <div className="blockchain-grid">
            <div className="block-cube block-1">
              <div className="cube-face cube-top"></div>
              <div className="cube-face cube-front"></div>
              <div className="cube-face cube-right"></div>
            </div>
            <div className="block-cube block-2">
              <div className="cube-face cube-top"></div>
              <div className="cube-face cube-front"></div>
              <div className="cube-face cube-right"></div>
            </div>
            <div className="block-cube block-3">
              <div className="cube-face cube-top"></div>
              <div className="cube-face cube-front"></div>
              <div className="cube-face cube-right"></div>
            </div>
            <div className="block-cube block-4">
              <div className="cube-face cube-top"></div>
              <div className="cube-face cube-front"></div>
              <div className="cube-face cube-right"></div>
            </div>
            <svg className="blockchain-lines" viewBox="0 0 200 200">
              <line x1="50" y1="50" x2="150" y2="50" className="connection-line" />
              <line x1="150" y1="50" x2="150" y2="150" className="connection-line" />
              <line x1="150" y1="150" x2="50" y2="150" className="connection-line" />
              <line x1="50" y1="150" x2="50" y2="50" className="connection-line" />
            </svg>
          </div>
        </div>
        <div className="blockchain-loader-text">{message}</div>
        <div className="blockchain-loader-subtitle">거래가 블록체인에 등록되고 있습니다...</div>
      </div>
    </div>
  );
}

