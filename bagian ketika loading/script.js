const progress = document.querySelector(".bar");
const percent = document.getElementById("percent");
const status = document.querySelector(".status p");
const loader = document.querySelector(".loader");

let value = 0;

function startUpload(){

    value = 0;

    progress.style.width = "0%";
    percent.textContent = "0%";
    status.textContent = "Uploading...";

    loader.className = "loader";
    loader.innerHTML = "";

    const timer = setInterval(() => {

        value++;

        progress.style.width = value + "%";
        percent.textContent = value + "%";

        if(value >= 100){

            clearInterval(timer);

            status.textContent = "Upload Complete";

            loader.classList.add("done");
            loader.innerHTML = '<i class="fa-solid fa-check"></i>';

        }

    },45);

}

startUpload();