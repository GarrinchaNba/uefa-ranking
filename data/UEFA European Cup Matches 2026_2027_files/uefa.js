
function GetChannelCode(channel) {
//
// Bert Kassies, 2021
// Get Google Adsense channel code
//

  if (channel == "uefa") {
    return "5630142510";
  } else if (channel == "uefadata") {
    return "6878538223";
  } else if (channel == "uefaqual") {
    return "3344422155";
  } else if (channel == "uefaclubs") {
    return "9633701838";
  } else if (channel == "uefaforum") {
    return "5280388208";
  } else { //  channel = "other"
    return "1177375098";
  }

}


function GoogleAdvars(channel,format) {
//
// Set environment for display of a specific sized Ad
// format like "728x90"
// Bert Kassies, 2021
//

  var w = format.substring(0,3);
  var h = format.substring(4,7);

  google_ad_client = "pub-5302570713207578";
  google_ad_width = parseInt(w);
  google_ad_height = parseInt(h);
  google_ad_format = w+"x"+h+"_as";
  google_ad_type = "text_image";
  google_ad_channel = GetChannelCode(channel);

}


function GoogleAds(channel) {
//
// Bert Kassies, 2021
// Load adsense library dynamicly
//

  google_ad_channel = GetChannelCode(channel);

  var newScript = document.createElement("script");
  newScript.setAttribute("data-ad-client", "ca-pub-5302570713207578");
  newScript.setAttribute("data-ad-channel", google_ad_channel);
  newScript.setAttribute("async", "true");
  newScript.setAttribute("src", "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js");
  document.documentElement.firstChild.appendChild(newScript);

}


function GoogleGtag() {
//
// Bert Kassies, 2023
// Load the gtag library dynamicly
//

  var myDomain = window.location.host;
  if (myDomain == 'kassiesa.net') {
    var myProperty = 'G-7Y2W4PNWT2';
  } else if (myDomain == 'bertkassies.nl') {
    var myProperty = 'G-MVK2G5QX97';
  }

  var gtagManager = 'https://www.googletagmanager.com/gtag/js?id=' + myProperty;
  var newScript = document.createElement("script");
  newScript.setAttribute("async", "true");
  newScript.setAttribute("src", gtagManager);
  document.documentElement.firstChild.appendChild(newScript);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  gtag('js', new Date());
  gtag('config', myProperty);
}


var newWindow;
function NewWindow(mypage, w, h, scroll) {
//
// Open window at screen top center position
// Bert Kassies, 2006
//
 var l = (screen.width) ? (screen.width-w)/2 : 0;
 var t = (screen.height) ? (screen.height-h-150)/2 : 0;
 var settings = 'height=' + h + ',width=' + w + ',top=' + t +
                ',left=' + l + ',scrollbars=' + scroll +
                ',resizable,location,menubar,toolbar';
 newWindow = window.open(mypage, 'uefacoef', settings);
 newWindow.focus();
}


function ScrollDown() {
 window.scroll(1, 99999);
}

function ScrollUp() {
 window.scroll(1, -99999);
}


function toCETString(dateInput) {
 var gmt = new Date(+dateInput);
 var lsm = new Date();
 var lso = new Date();
 lsm.setMonth(2); // March
 lsm.setDate(31);
 var day = lsm.getDay();// day of week of 31st
 lsm.setDate(31-day); // last Sunday
 lso.setMonth(9); // October
 lso.setDate(31);
 day = lso.getDay();
 lso.setDate(31-day);
 var dst = 0;
 if (gmt >= lsm && gmt < lso) dst = 1;
 cet = new Date(+gmt + (1+dst)*3600000);
 return cet.toUTCString().replace("UTC","CET").replace("GMT","CET");
}

function getLastModifiedUTC(doc) {
  var lm = new Date(doc.lastModified);
  return lm;
}


function getWindowHeight() {
 if (window.self && self.innerHeight) {
  return self.innerHeight;
 }
 if (document.documentElement && document.documentElement.clientHeight) {
  return document.documentElement.clientHeight;
 }
 if (document.body && document.body.clientHeight) {
  return document.body.clientHeight;
 }
 return 0;
}


function resizeDiv(divId, minHeight, vertMargin) {
// (obsolete function)
}

function printContent(id) {
// (obsolete function)
}

function GoogleAnalytics() {
// (obsolete function)
}

function PageTracking() {
// (obsolete function)
}
