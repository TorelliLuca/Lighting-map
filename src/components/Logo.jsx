import logoImage from "../assets/faviconWhite.png";

const Logo = ({ className = "", imgClassName = "", alt = "Lighting Map Logo", onClick }) => {
  // Estraiamo tutte le classi relative all'altezza (es. h-10, sm:h-12, h-[60px], max-h-...)
  const heightClassesMatch = className.match(/(\b\S*h-\S+)/g);
  const heightClasses = heightClassesMatch ? heightClassesMatch.join(" ") : "h-14 sm:h-16 md:h-20 lg:h-24";

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${onClick ? "cursor-pointer" : ""} ${heightClasses} ${className}`}
      onClick={onClick}
    >
      <img
        src={logoImage}
        alt={alt}
        className={`w-auto object-contain filter drop-shadow-[0_0_10px_rgba(59,130,246,0.35)] transition-all duration-300 hover:drop-shadow-[0_0_16px_rgba(59,130,246,0.6)] ${heightClasses} ${imgClassName}`}
      />
    </div>
  );
};

export default Logo;