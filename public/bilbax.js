(function () {
  var root = document.querySelector('[data-bilbax]');
  if (!root) return;

  var nav = root.querySelector('[data-mobile-nav]');
  var menuToggle = root.querySelector('[data-menu-toggle]');
  var menuOpen = root.querySelector('[data-menu-open]');
  var menuClose = root.querySelector('[data-menu-close]');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      if (menuOpen) menuOpen.hidden = isOpen;
      if (menuClose) menuClose.hidden = !isOpen;
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open menu');
        if (menuOpen) menuOpen.hidden = false;
        if (menuClose) menuClose.hidden = true;
      });
    });
  }

  var observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      }, { threshold: 0.12 })
    : null;
  root.querySelectorAll('.reveal').forEach(function (element) {
    if (observer) observer.observe(element);
    else element.classList.add('is-visible');
  });

  root.querySelectorAll('.faq-question').forEach(function (button) {
    button.addEventListener('click', function () {
      var answer = button.nextElementSibling;
      var expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      if (answer) answer.hidden = expanded;
    });
  });

  var demoForm = root.querySelector('[data-demo-form]');
  var demoInput = root.querySelector('[data-demo-input]');
  var demoReply = root.querySelector('[data-demo-reply]');
  var demoStatus = root.querySelector('[data-demo-status]');
  if (demoForm && demoInput && demoReply && demoStatus) {
    demoForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!demoInput.value.trim()) return;
      demoReply.textContent = 'Here you go — reply sent. Want the size guide too?';
      demoStatus.textContent = 'Reply sent. That is the idea.';
      demoInput.value = '';
    });
  }

  root.querySelectorAll('[data-plan]').forEach(function (button) {
    button.addEventListener('click', function () {
      var card = button.closest('.plan-slide');
      var feedback = card && card.querySelector('[data-plan-feedback]');
      if (feedback) feedback.textContent = button.getAttribute('data-plan') + ' selected — your free setup starts here.';
    });
  });

  var track = root.querySelector('[data-plan-track]');
  var dots = root.querySelectorAll('[data-dot]');
  if (track) {
    var slides = track.querySelectorAll('.plan-slide');

    function setActive(index) {
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === index);
      });
    }

    function goToSlide(index) {
      var slide = slides[index];
      if (!slide) return;
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = Number(dot.getAttribute('data-dot'));
        goToSlide(index);
        setActive(index);
      });
    });

    var scrollTimer;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var trackLeft = track.scrollLeft;
        var closest = 0;
        var closestDist = Infinity;
        slides.forEach(function (slide, i) {
          var dist = Math.abs((slide.offsetLeft - track.offsetLeft) - trackLeft);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        setActive(closest);
      }, 100);
    });

    // Growth (index 2) is the featured plan — land there first on mobile.
    if (window.matchMedia('(max-width: 899px)').matches) {
      setTimeout(function () { goToSlide(2); setActive(2); }, 50);
    }
  }
})();
