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

  const iconObserver = new MutationObserver((mutations) => {
    const m = document.querySelector(".codicon-github");
    try {
      m.classList.remove("codicon-github");
      m.classList.remove("codicon");
    } catch (error) {}
  });

  // call `observe()`, passing it the element to observe, and the options object
  iconObserver.observe(document.querySelector(".sidebar .actions-container"), {
    childList: true,
  });

  // observe this document.getElementsByClassName("sidebar")[0].clientWidth
  const sidebarObserver = new MutationObserver((mutations) => {
    /** @type {HTMLDivElement} */
    const sidebar = document.querySelector(".sidebar");
    const sidebarMimic = document.querySelector("#sidebar-mimic");

    sidebarMimic.style.width = `${sidebar.clientWidth}px`;
  });

  sidebarObserver.observe(document.getElementById("workbench.parts.sidebar"), {
    subtree: true,
    attributes: true,
  });

  const sidebarMimic = document.createElement("div");
  sidebarMimic.id = "sidebar-mimic";

  /** @type {HTMLDivElement} */
  const statusbarElement = document.querySelector(".statusbar");
  statusbarElement.appendChild(sidebarMimic);
} catch (error) {
  console.log("TEST", error);
}
