document.getElementById('uploadButton').addEventListener('click', function() {
    document.getElementById('popup').classList.remove('popup-hidden');
    document.getElementById('popup').classList.add('popup-open');
  });
  
  document.getElementById('closePopup').addEventListener('click', function() {
    document.getElementById('popup').classList.add('popup-hidden');
    document.getElementById('popup').classList.remove('popup-open');
  });
  
  document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        // Handle the file (e.g., preview it, upload it)
        console.log(`Selected file: ${file.name}`);
    }
  });

  function openModal(imageSrc) {
    const modal = document.getElementById("imageModal");
    const fullImage = document.getElementById("fullImage");

    // Set the source of the image in the modal
    fullImage.src = `data:image/png;base64,${imageSrc}`;

    // Display the modal
    modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("imageModal");
    modal.style.display = "none";
}
