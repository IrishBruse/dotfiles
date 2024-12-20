const { exec } = require("child_process");

try {
  function debounce(func, timeout = 300) {
    let timer;

    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }

  const iconObserver = new MutationObserver(() => {
    const m = document.querySelector(
      ".sidebar .actions-container .codicon-github"
    );
    try {
      m.classList.remove("codicon-github");
      m.classList.remove("codicon");
    } catch (error) {}
  });

  // call `observe()`, passing it the element to observe, and the options object
  iconObserver.observe(document.querySelector(".sidebar .actions-container"), {
    childList: true,
  });
} catch (error) {
  console.error("vscode.js ERROR", error);
}

try {
  setTimeout(() => {
    document
      .getElementById("fabiospampinato.vscode-commands")
      ?.addEventListener("click", () => {
        console.log("CLICK");

        exec("view");
      });
  }, 10_000);
} catch (err) {
  console.error("vscode.js ERROR", error);
}
