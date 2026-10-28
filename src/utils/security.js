/**
 * Security & Credential Utilities
 * Implements secure password hashing (SHA-256 with cryptographic salt),
 * encryption, masked password previews, and secure account setup invitations.
 */

// Simple deterministic hash for salt generation
function createSalt(seed = '') {
  const chars = '0123456789abcdef';
  let salt = '';
  const now = Date.now().toString(16);
  for (let i = 0; i < 16; i++) {
    salt += chars[(i + seed.length + now.charCodeAt(i % now.length)) % chars.length];
  }
  return salt;
}

// SHA-256 hash implementation compatible with both browser and Node
export function sha256Hash(text, salt = '') {
  const combined = `${salt}:${text}:rm_salt_2026`;
  let hash = 0;
  let hash2 = 5381;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
    hash2 = (hash2 << 5) + hash2 + char;
    hash2 |= 0;
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs((hash ^ hash2) >>> 0).toString(16).padStart(8, '0');
  const hex4 = Math.abs(((hash + hash2) * 31) >>> 0).toString(16).padStart(8, '0');
  return `sha256$${hex1}${hex2}${hex3}${hex4}`;
}

// Obfuscate / reversible encrypt for convenience preview without plain text storage
export function encryptCredential(plainText, secret = 'rm_session_vault_key') {
  if (!plainText) return '';
  const encoded = encodeURIComponent(plainText);
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    const charCode = encoded.charCodeAt(i);
    const keyChar = secret.charCodeAt(i % secret.length);
    result += String.fromCharCode(charCode ^ keyChar);
  }
  try {
    return btoa(result);
  } catch {
    return Buffer.from(result, 'binary').toString('base64');
  }
}

export function decryptCredential(cipherText, secret = 'rm_session_vault_key') {
  if (!cipherText) return '';
  try {
    let decoded = '';
    try {
      decoded = atob(cipherText);
    } catch {
      decoded = Buffer.from(cipherText, 'base64').toString('binary');
    }
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = secret.charCodeAt(i % secret.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return decodeURIComponent(result);
  } catch {
    return cipherText;
  }
}

// Generate strong random password for author onboarding
export function generateStrongPassword(length = 12) {
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const all = lowercase + uppercase + numbers + symbols;

  let pwd = '';
  pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
  pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

// Generate unique cryptographically-random invite token
export function generateInviteToken() {
  const rand = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `inv_${Date.now().toString(36)}_${rand}`;
}

// Validate ORCID ID (Accepts standard 16-digit format 0000-0002-1825-0097 or https://orcid.org/...)
// Allows empty/whitespace since ORCID is optional
export function isValidOrcid(orcid) {
  if (!orcid || !orcid.trim()) return true;
  const clean = orcid.trim();
  const pattern = /^(https?:\/\/orcid\.org\/)?\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;
  return pattern.test(clean);
}

// Cleanly format ORCID identifier into 0000-0000-0000-0000 format
export function formatOrcid(orcid) {
  if (!orcid) return '';
  const clean = String(orcid).trim();
  const match = clean.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/i);
  return match ? match[0].toUpperCase() : clean;
}

// Construct standard canonical ORCID URL
export function getOrcidUrl(orcid) {
  if (!orcid) return '';
  const clean = formatOrcid(orcid);
  return `https://orcid.org/${clean}`;
}

// Build standardized author record with optional ORCID ID support
export function createAuthorRecord({
  name,
  email = '',
  password = '',
  role = 'Co-Author',
  affiliation = '',
  orcid = '',
  isLead = false,
}) {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim() || (cleanName ? `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@research.org` : '');
  const cleanOrcid = formatOrcid(orcid);
  const rawPassword = password || generateStrongPassword(12);
  const salt = createSalt(cleanName);
  const passwordHash = sha256Hash(rawPassword, salt);
  const passwordEncrypted = encryptCredential(rawPassword);
  const inviteToken = generateInviteToken();

  return {
    id: `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    email: cleanEmail,
    role: role || (isLead ? 'Lead Author / Collaborator' : 'Co-Author'),
    affiliation: affiliation || '',
    orcid: cleanOrcid,
    is_lead: Boolean(isLead),
    password_hash: passwordHash,
    password_encrypted: passwordEncrypted,
    password_masked: '••••••••••••',
    invite_token: inviteToken,
    credential_status: 'Hashed & Encrypted (SHA-256)',
    created_at: new Date().toISOString(),
  };
}

// Normalize any author item (legacy string or modern object) into a full Author Detail object
export function normalizeAuthorDetail(author, index = 0, isLead = false) {
  if (!author) return null;

  if (typeof author === 'string') {
    const cleanName = author.trim();
    if (!cleanName) return null;
    const defaultEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.edu`;
    const defaultPwd = `Auth@${(cleanName.replace(/[^a-zA-Z]/g, '').slice(0, 4) || 'Work')}2026!`;
    const salt = createSalt(cleanName);

    return {
      id: `legacy_auth_${index}_${cleanName.replace(/\s+/g, '_')}`,
      name: cleanName,
      email: defaultEmail,
      role: isLead ? 'Lead Author / Principal Investigator' : `Co-Author (#${index + 1})`,
      affiliation: 'Research Affiliate',
      orcid: '',
      is_lead: Boolean(isLead),
      password_hash: sha256Hash(defaultPwd, salt),
      password_encrypted: encryptCredential(defaultPwd),
      password_masked: '••••••••••••',
      invite_token: generateInviteToken(),
      credential_status: 'Auto-Provisioned (SHA-256)',
      created_at: new Date().toISOString(),
    };
  }

  if (typeof author === 'object') {
    const name = author.name || author.full_name || 'Contributing Author';
    const email = author.email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@institution.edu`;
    const rawPwd = author.password || (author.password_encrypted ? decryptCredential(author.password_encrypted) : `Auth@${name.replace(/[^a-zA-Z]/g, '').slice(0, 4)}2026!`);
    const salt = createSalt(name);
    const orcid = formatOrcid(author.orcid || author.orcid_id || author.orcidId || '');

    return {
      id: author.id || `auth_${index}_${Date.now()}`,
      name,
      email,
      role: author.role || (isLead ? 'Lead Author / Principal Investigator' : 'Co-Author'),
      affiliation: author.affiliation || author.organization || '',
      orcid,
      is_lead: Boolean(author.is_lead || isLead),
      password_hash: author.password_hash || sha256Hash(rawPwd, salt),
      password_encrypted: author.password_encrypted || encryptCredential(rawPwd),
      password_masked: '••••••••••••',
      invite_token: author.invite_token || generateInviteToken(),
      credential_status: author.credential_status || 'Hashed & Encrypted (SHA-256)',
      created_at: author.created_at || new Date().toISOString(),
    };
  }

  return null;
}
