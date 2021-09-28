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

  // Sweet Alert.js

  // Create store alert
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: "signup",
      cancelButton: "btn btn-danger",
    },
    buttonsStyling: false,
  });
  const clickFunction = () => {
    swalWithBootstrapButtons
      .fire({
        title: "All done...",
        text: "By Creating an account you agree with Invoicier terms and conditions",
        // timer: 5000,
        showCancelButton: true,
        showConfirmButton: true,
        showLoaderOnConfirm: true,
        confirmButtonText: "Yes I agree",
      })
      .then((result) => {
        if (result.isConfirmed) {
          swalWithBootstrapButtons
            .fire({
              icon: "success",
              title: "Drum Rolls...",
              text: "Creating store wait a second",
              timer: 5000,
              backdrop: `
              rgba(0,0,123,0.4)
              url("/images/nyan-cat.gif")
              left top
              no-repeat
            `,
              timerProgressBar: true,
              showCancelButton: false,
              showConfirmButton: false,
              showLoaderOnConfirm: false,
            })
            .then(function () {
              window.location = "dashboard.html";
            });
        } else if (
          /* Read more about handling dismissals below */
          result.dismiss === Swal.DismissReason.cancel
        ) {
          swalWithBootstrapButtons.fire(
            "Cancelled",
            "You still can check our other offers :)",
            "error"
          );
        }
      });
  };
