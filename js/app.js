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
      customClass: {
        container: "...",
        popup: "...",
        header: "...",
        title: "...",
        closeButton: "...",
        icon: "...",
        image: "...",
        content: "...",
        htmlContainer: "...",
        input: "...",
        inputLabel: "...",
        validationMessage: "...",
        actions: "...",
        confirmButton: "btn-confirm",
        denyButton: "",
        cancelButton: "btn-cancel",
        loader: "...",
        footer: "....",
      },
    })
    .then((result) => {
      if (result.isConfirmed) {
        swalWithBootstrapButtons
          .fire({
            icon: "success",
            title: "Drum Rolls...",
            text: "Creating account wait a second",
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

function sendToUser() {
  Swal.fire({
    title: "Email of Client",
    input: "text",
    inputAttributes: {
      autocapitalize: "off",
    },
    showCancelButton: true,
    confirmButtonText: "Send Mail",
    showLoaderOnConfirm: true,
    preConfirm: (login) => {
      return fetch("")
        .then((response) => {
          if (!response.ok) {
            throw new Error(response.statusText);
          }
          return response.json();
        })
        .catch((error) => {
          Swal.showValidationMessage(`Request failed: ${error}`);
        });
    },
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: `${result.value.login}'s avatar`,
        imageUrl: result.value.avatar_url,
      });
    }
  });
}

const copyLink = () => {
  Swal.fire({
    icon: "success",
    title: "Linked Copied Successfully!",
    // position: "top-end",
  });
};

function invoicierDownload() {
  Swal.fire({
    // icon: "success",
    title: "Downloading Please wait....",
    timer: 5400,
    showConfirmButton: false,
    timerProgressBar: true,
    backdrop: true,
  }).then(function () {
    Swal.fire({
      icon: "success",
      title: "Downloaded Successfully",

      // timer: 2000,
      // timerProgressBar: true,
    });
  });
}
