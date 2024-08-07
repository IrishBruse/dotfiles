function debounce(func, timeout = 300) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

/** @type { (...args: MutationRecord[]) => void} */
const lineUpdate = debounce((mutations) => {
  let lastLineHeight = 0;
  let lastLine = 0;

  const lines = document.querySelector(".view-lines");

  console.log("TEST", lines);

  lines.childNodes.forEach((line) => {
    const styles = getComputedStyle(line);
    const lineHeight = parseInt(styles.top);
    if (lineHeight > lastLineHeight) {
      lastLineHeight = lineHeight;
      lastLine = line;
    }
  });

  lastLine.classList.add("last-line");
}, 250);

(function () {
  const iconObserver = new MutationObserver((mutations) => {
    mutations.childNodes.forEach((m) => {
      const element = document.querySelector(
        ".sidebar a[aria-label='GitHub Pull Requests']"
      );

      element?.classList.remove("codicon-github");
      element?.classList.remove("codicon");
    });
  });

  // call `observe()`, passing it the element to observe, and the options object
  iconObserver.observe(
    document.querySelector(".sidebar > .header .actions-container"),
    { childList: true }
  );

  const lineObserver = new MutationObserver(lineUpdate);

  // call `observe()`, passing it the element to observe, and the options object
  lineObserver.observe(
    document.querySelector(".monaco-editor .view-lines > div"),
    { subtree: true, childList: true, attributes: true }
  );
})();
