const ElectricPanelMarker = ({ color }) => {
    return (
      <div className="relative cursor-pointer" style={{ width: '40px', height: '40px' }}>
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Main panel background */}
          <rect
            x="5"
            y="5"
            width="30"
            height="30"
            rx="2"
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
          {/* Panel door */}
          <rect
            x="10"
            y="10"
            width="20"
            height="20"
            rx="1"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          {/* Electrical components */}
          <line
            x1="15"
            y1="15"
            x2="25"
            y2="15"
            stroke="white"
            strokeWidth="1.5"
          />
          <line
            x1="15"
            y1="20"
            x2="25"
            y2="20"
            stroke="white"
            strokeWidth="1.5"
          />
          <line
            x1="15"
            y1="25"
            x2="25"
            y2="25"
            stroke="white"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  };
export default ElectricPanelMarker;