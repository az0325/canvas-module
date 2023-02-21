import { useEffect } from "react";
import { debounce } from "lodash-es";

/**
 * @description 브라우저 리사이즈 감지
 * @param callback
 */
const useDebounceResize = (callback: () => void) => {
  const resize = debounce(callback);

  useEffect(() => {
    window.addEventListener("resize", resize, false);

    return () => {
      window.removeEventListener("resize", resize);
    };
  });
};

export default useDebounceResize;
