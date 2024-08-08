function debounce(func, timeout = 300) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

const iconObserver = new MutationObserver((mutations) => {
  const m = document.querySelector(".codicon-github");
  m.classList.remove("codicon-github");
  m.classList.remove("codicon");
});

// call `observe()`, passing it the element to observe, and the options object
iconObserver.observe(document.querySelector(".sidebar .actions-container"), {
  childList: true,
});

const lineObserver = new MutationObserver(
  debounce((mutations) => {
    let lastLineHeight = 0;
    let lastLine = 0;

    const lines = document.querySelector(".view-lines");

    lines.childNodes.forEach((line) => {
      const styles = getComputedStyle(line);
      const lineHeight = parseInt(styles.top);
      if (lineHeight > lastLineHeight) {
        lastLineHeight = lineHeight;
        lastLine = line;
      }
    });

    lastLine.classList.add("last-line");
  })
);

// call `observe()`, passing it the element to observe, and the options object
lineObserver.observe(
  document.querySelector(".monaco-editor .view-lines > .view-line"),
  { subtree: true, childList: true, attributes: true }
);
