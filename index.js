const apiUrl = "http://127.0.0.1:8000";

            function handleKeyPress(event) {
                if (event.key === "Enter") {
                    searchJobs();
                }
            }

            async function get_all_jobs(label) {
                const filterDropdown = document.getElementById('filterDropdown');
                const searchQueryInput = document.getElementById('searchQuery');
                filterDropdown.textContent = label;
                searchQueryInput.value = '';
                try {
                    const response = await fetch(`${apiUrl}/all`);
                    const result = await response.json();
                    updateRecordsCount(result.jobs.length);
                    displayJobs(result.jobs);
                } catch (error) {
                    console.error("Error fetching jobs:", error);
                }
            }

            async function filter_by_time(range, label) {
                const filterDropdown = document.getElementById('filterDropdown');
                const searchQueryInput = document.getElementById('searchQuery');
                filterDropdown.textContent = label;
                searchQueryInput.value = '';
                try {
                    const response = await fetch(`${apiUrl}/filter/?query=${range}`);
                    const result = await response.json();
                    updateRecordsCount(result.jobs.length);
                    displayJobs(result.jobs);
                } catch (error) {
                    console.error("Error fetching jobs:", error);
                }
            }

            function updateRecordsCount(count) {
                const recordsCount = document.getElementById('recordsCount');
                recordsCount.textContent = `Showing ${count} jobs`;
            }

            async function searchJobs() {
                const query = document.getElementById('searchQuery').value;

                if (!query) {
                    alert("Please enter a search query.");
                    return;
                }

                // Reset filter dropdown to default label
                const filterDropdown = document.getElementById('filterDropdown');
                filterDropdown.textContent = "Filter jobs by time";

                try {
                    const response = await fetch(`${apiUrl}/jobs/?query=${query}`);
                    const result = await response.json();
                    updateRecordsCount(result.jobs.length);
                    displayJobs(result.jobs);
                } catch (error) {
                    console.error("Error fetching jobs:", error);
                }
            }

            document.addEventListener("DOMContentLoaded", () => {
                // Prevent any default form submission globally (if inside a form)
                const forms = document.querySelectorAll('form');
                forms.forEach(form => {
                    form.addEventListener('submit', (event) => {
                        event.preventDefault(); // Stop form submission
                    });
                });

                // Attach event listener for upload button
                const uploadButton = document.getElementById('uploadResumeButton');
                uploadButton.addEventListener('click', (event) => {
                    console.log('HERE');
                    event.preventDefault(); // Prevent page refresh
                    const fileInput = document.getElementById('pdfFile'); // Reference the file input
                    uploadResume(fileInput);
                });
            });

            async function uploadResume(fileInput) {
                const file = fileInput.files[0]; // Get the selected file

                if (!file) {
                    alert('Please select a PDF file.');
                    return;
                }

                if (file.type !== 'application/pdf') {
                    alert('Only PDF files are allowed.');
                    fileInput.value = ''; // Reset file input
                    return;
                }

                const formData = new FormData();
                formData.append('resume', file);

                try {
                    console.log("Uploading file...");
                    const response = await fetch("http://127.0.0.1:8000/skills", {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    displayJobs(result.jobs);
                } catch (error) {
                    console.error('Error uploading the file:', error);
                    alert('An error occurred while uploading the file.');
                } finally {
                    fileInput.value = ''; // Reset the file input
                }
            }

            function displayJobs(jobs) {
                const jobResultsDiv = document.getElementById('jobResults');
                jobResultsDiv.innerHTML = '';

                if (jobs.length === 0) {
                    jobResultsDiv.innerHTML = '<p class="text-center fw-bold fs-3">Sorry! Looks like we don\'t have jobs matching your query.</p>';
                    return;
                }

                jobs.forEach(job => {
                    const jobCard = document.createElement('div');
                    jobCard.className = 'job-card';
                    jobCard.innerHTML = `
                        <h3 class="text-light">${job.title}</h3>
                        <p><strong>Description:</strong> ${job.description}</p>
                        <p><strong>Location:</strong> ${job.location}</p>
                        <p><strong>Skills:</strong> ${job.skills.join(', ')}</p>
                        <p><strong>Posted:</strong> ${job.posted_date}</p>
                        <button class="btn btn-primary apply-btn">Apply</button>
                    `;
                    jobResultsDiv.appendChild(jobCard);
                });
            }