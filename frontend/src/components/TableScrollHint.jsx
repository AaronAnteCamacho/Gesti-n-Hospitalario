import React, { useEffect, useState } from "react";

function getScrollState(el) {
  const overflow = el.scrollWidth > el.clientWidth + 2;
  const canLeft = overflow && el.scrollLeft > 2;
  const canRight =
    overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 2;

  return { overflow, canLeft, canRight };
}

export default function TableScrollHint({
  targetRef,
  className = "",
  text = "Desliza para ver más columnas",
  sticky = false,
}) {
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrollDir, setScrollDir] = useState("right");

  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;

    const check = () => {
      const { overflow, canLeft, canRight } = getScrollState(el);
      setHasOverflow(overflow);

      if (overflow && !canRight && canLeft) setScrollDir("left");
      else if (overflow && !canLeft && canRight) setScrollDir("right");
      else if (!overflow) setScrollDir("right");
    };

    const onScroll = () => requestAnimationFrame(check);

    requestAnimationFrame(check);
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", check);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", check);
    };
  }, [targetRef]);

  function stepScroll() {
    const el = targetRef?.current;
    if (!el) return;

    const step = Math.floor(el.clientWidth * 0.85);
    const dir = scrollDir === "right" ? 1 : -1;

    el.scrollBy({
      left: dir * step,
      behavior: "smooth",
    });
  }

  return (
    <div
      className={`${className} ${sticky ? "tableScrollHint--sticky" : ""}`.trim()}
    >
      <span>{text}</span>

      <button
        type="button"
        className="tableScrollHint__btn"
        onClick={stepScroll}
        disabled={!hasOverflow}
        title={!hasOverflow ? "No hay más columnas por mostrar" : "Desplazar"}
      >
        <i
          className={
            scrollDir === "right"
              ? "fa-solid fa-arrow-right"
              : "fa-solid fa-arrow-left"
          }
        />
      </button>
    </div>
  );
}