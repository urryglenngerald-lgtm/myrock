// myRock settings. Edit these values, nothing else needs to change.
window.MYROCK_CONFIG = {
  // LAUNCH DAY. Until this moment visitors see the "Loading Malta" countdown.
  // To see the real app before launch, open myrockmalta.com/?preview=1 (and ?preview=0 to switch back).
  // To switch the countdown off, set this to "".
  launchAt: "2026-12-15T00:00:00+01:00",
  loadingSince: "2026-11-17T00:00:00+01:00",

  // Where the "Advertise" button sends people. Put the business email here.
  adEmail: "",

  // Social pages. Leave empty ("") to hide a button.
  socials: {
    facebook: "",
    instagram: ""
  },

  // Where the Knock (food) tile goes. Empty = shows "coming soon".
  knockLink: "",

  // Weather location (Valletta).
  weather: { lat: 35.8989, lon: 14.5146, place: "Malta" },

  // How many events before the "This week" row starts sliding on its own.
  autoSlideFrom: 4
};
