---
title: "Contact"
subtitle: "Get in touch"
summary: "Contact information, office location, and a simple form."
date: 2025-01-01
type: page
---

<div class="container my-4">

  <!-- Title -->
  <div class="text-center mb-4">
    <h2 class="mb-2">Contact</h2>
    <p class="lead mb-0">
      For research collaborations, teaching, genealogical projects, or academic inquiries, feel free to reach out.
    </p>
  </div>

  <div class="row mt-4">

    <!-- Left column: contact details -->
    <div class="col-md-6 mb-4">
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body">
          <h4 class="card-title mb-3">
            <i class="fas fa-user"></i> Contact details
          </h4>

          <p class="mb-2">
            <strong>Email:</strong><br>
            <a href="mailto:alberto.montesanto@unical.it">alberto.montesanto@unical.it</a>
          </p>

          <p class="mb-2">
            <strong>Institution:</strong><br>
            Department of Biology, Ecology and Earth Sciences (DiBEST)<br>
            University of Calabria
          </p>

          <p class="mb-2">
            <strong>Address:</strong><br>
            Via P. Bucci<br>
            Arcavacata di Rende (CS), Italy
          </p>

          <p class="mb-2">
            <strong>Office hours:</strong><br>
            By appointment.
          </p>

          <hr>

          <h5 class="mt-3 mb-2">
            <i class="fas fa-share-alt"></i> Profiles
          </h5>
          <ul class="list-unstyled mb-0">
            <li>ORCID: <a href="https://orcid.org/0000-0002-9563-2216" target="_blank" rel="noopener">0000-0002-9563-2216</a></li>
            <li>Google Scholar: <a href="https://scholar.google.com" target="_blank" rel="noopener">Google Scholar profile</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Right column: map + form -->
    <div class="col-md-6 mb-4">

      <!-- Google Map -->
      <div class="card shadow-sm border-0 mb-3">
        <div class="card-body p-2">
          <h5 class="card-title px-2 pt-2">
            <i class="fas fa-map-marker-alt"></i> Office location
          </h5>
          <div class="ratio ratio-4x3">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3125.232481987425!2d16.223!3d39.356!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x133f8f4b3d2d7e6f%3A0x65bcdcd9d61d780c!2sUniversit%C3%A0%20della%20Calabria!5e0!3m2!1sit!2sit!4v1700000000000"
              width="100%" height="100%" style="border:0;" allowfullscreen=""
              loading="lazy" referrerpolicy="no-referrer-when-downgrade">
            </iframe>
          </div>
        </div>
      </div>

      <!-- Contact form (Wowchemy shortcode) -->
      <div class="card shadow-sm border-0">
        <div class="card-body">
          <h5 class="card-title mb-3">
            <i class="fas fa-envelope"></i> Send a message
          </h5>

          {{< form-contact >}}

        </div>
      </div>

    </div>
  </div>
</div>
