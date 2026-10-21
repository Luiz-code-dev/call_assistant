/**
 * Known disposable / temporary email domains.
 * Used to block throwaway accounts at registration.
 */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.de", "guerrillamail.biz", "guerrillamailblock.com",
  "sharklasers.com", "grr.la", "guerrillamailblock.com", "spam4.me",
  "tempmail.com", "temp-mail.org", "tempr.email", "dispostable.com",
  "throwam.com", "throwam.net", "throwam.org", "yopmail.com", "yopmail.fr",
  "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx",
  "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf",
  "monemail.fr.nf", "monmail.fr.nf", "trashmail.at", "trashmail.com",
  "trashmail.de", "trashmail.io", "trashmail.me", "trashmail.net",
  "trashmail.org", "trashmail.xyz", "trashmailer.com", "trashcanmail.com",
  "fakeinbox.com", "fakeinbox.net", "discard.email", "maildrop.cc",
  "mailnull.com", "mailnull.com", "spamgourmet.com", "spamgourmet.net",
  "spamgourmet.org", "trashmail.fr", "jetable.net", "jetable.org",
  "jetable.pp.ua", "filzmail.com", "filzmail.de", "momentics.ru",
  "temporaryemail.net", "temporaryemail.us", "throwam.com", "spamcero.com",
  "owlpic.com", "mailnesia.com", "mailnesia.com", "e4ward.com",
  "spamhereplease.com", "meltmail.com", "noclickemail.com", "nowmymail.com",
  "humaility.com", "kasmail.com", "maileater.com", "mail-filter.com",
  "no-spam.ws", "nospamfor.us", "nospamthanks.info", "privacy.net",
  "shieldedmail.com", "skeefmail.com", "spam-be-gone.com",
  "spam.la", "spamavert.com", "spambox.us", "spamcannon.com",
  "spamdecoy.net", "spamex.com", "spamfree24.org", "spamgob.com",
  "spamherelots.com", "spaminmotion.com", "spammotel.com",
  "spamoff.de", "spamslicer.com", "spamspot.com", "spamthisplease.com",
  "spamtrail.com", "superstachel.de", "tafmail.com",
  "tempalias.com", "tempinbox.com", "tempinbox.net",
  "tempomail.fr", "temporaryforwarding.com", "thanksnospam.info",
  "throwam.com", "throwam.net", "trbvm.com", "trommlergang.de",
  "turual.com", "uggsrock.com", "uroid.com", "venompen.com",
  "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "wh4f.org", "whyspam.me", "willhackforfood.biz", "willselfdestruct.com",
  "wilemail.com", "winemaven.info", "wronghead.com",
  "xagloo.com", "xemaps.com", "xents.com", "xmaily.com", "xoxy.net",
  "yapped.net", "yeah.net", "yuurok.com", "za.com", "zehnminuten.de",
  "zippymail.info", "zoemail.net", "zoemail.org", "zomg.info",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}
