import logoImage from "../assets/faviconWhite.png";

const Logo = ({ className = "" }) => {
  return (
    <div className={`text-white font-bold text-xl flex items-center ${className}`}>
      <img src={logoImage} alt="Logo" className="h-8 w-auto mr-2" />
      <span className="text-blue-400">Lighting</span>
      <span className="text-white">Map</span>
    </div>
  );
};

export default Logo;