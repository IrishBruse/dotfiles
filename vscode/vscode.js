const observer = new MutationObserver((mutations) => {
  mutations.forEach((m) => {
    const element = document.querySelector(
      ".sidebar a[aria-label='GitHub Pull Requests']"
    );

    element?.classList.remove("codicon-github");
    element?.classList.remove("codicon");
  });
});

// call `observe()`, passing it the element to observe, and the options object
observer.observe(
  document.querySelector(".sidebar > .header .actions-container"),
  { childList: true }
);
