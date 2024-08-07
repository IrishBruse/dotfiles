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
  const lines = mutations[0].target;
  lines.childNodes.forEach((m) => {
    if (m.getAttribute("aria-label") === "GitHub Pull Requests") {
      m.childNodes[0].classList.remove("codicon-github");
      m.childNodes[0].classList.remove("codicon");
    }
  });
});

// call `observe()`, passing it the element to observe, and the options object
iconObserver.observe(
  document.querySelector(".sidebar > .header .actions-container"),
  { childList: true }
);

const lineObserver = new MutationObserver(
  debounce((mutations) => {
    let lastLineHeight = 0;
    let lastLine = 0;

    const lines = document.querySelector(".view-lines");

    console.log("TEST2", mutations[0].target);

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
