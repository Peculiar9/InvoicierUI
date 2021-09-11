// Chart Js

//Toggle

function ClickMe() {
  const sideBtn = document.querySelectorAll(".btnSide");
  sideBtn.map((item) => {
    return item.index(0);
  });
  console.log(sideBtn);
}

const toggleBtn = () => {
  const home = document.querySelector(".home");
  const invoices = document.querySelector(".invoices");
  const clients = document.querySelector(".clients");
  const services = document.querySelector(".services");

  home.classList.toggle("active");
  invoices.classList.toggle("active");
  clients.classList.toggle("active");
  services.classList.toggle("active");
};
function toggleNav() {
  const toggleBtn = document.querySelector(".toggle-btn");
  const navBar = document.querySelector(".navigation");
  toggleBtn.classList.toggle("active");
  navBar.classList.toggle("active");
}
