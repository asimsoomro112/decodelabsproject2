/** Endpoint manifest: drives the Docs cards and the Playground autocomplete. */

export interface EndpointStatus {
  code: number;
  meaning: string;
}

export interface EndpointDoc {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  auth?: 'write-key';
  query?: { name: string; type: string; description: string }[];
  bodyExample?: unknown;
  statuses: EndpointStatus[];
}

const COURSE_EXAMPLE = {
  title: 'GraphQL in Practice',
  description: 'Schemas, resolvers and federation for product APIs.',
  level: 'intermediate',
  seats: 40,
  startDate: '2026-12-01',
};

export const ENDPOINTS: EndpointDoc[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/v1/health',
    title: 'Service health',
    description: 'Liveness probe. Returns status, uptime, version and the server timestamp.',
    statuses: [{ code: 200, meaning: 'The service is alive.' }],
  },
  {
    id: 'list-courses',
    method: 'GET',
    path: '/api/v1/courses',
    title: 'List courses',
    description: 'Filter by level, search with q, paginate with page/limit (max 50).',
    query: [
      { name: 'level', type: 'beginner | intermediate | advanced', description: 'Filter by level.' },
      { name: 'q', type: 'string', description: 'Case-insensitive search over title + description.' },
      { name: 'page', type: 'integer ≥ 1', description: 'Page number (default 1).' },
      { name: 'limit', type: '1–50', description: 'Page size (default 10).' },
    ],
    statuses: [
      { code: 200, meaning: '{ data, meta: { total, page, limit } }' },
      { code: 400, meaning: 'Invalid query (e.g. limit > 50).' },
      { code: 429, meaning: 'Rate limited.' },
    ],
  },
  {
    id: 'create-course',
    method: 'POST',
    path: '/api/v1/courses',
    title: 'Create a course',
    description:
      'Requires the write API key. Gatekeeper layer 1: strict Zod schema (400). Layer 2: startDate must not be in the past (422); title + startDate must be unique (409).',
    auth: 'write-key',
    bodyExample: COURSE_EXAMPLE,
    statuses: [
      { code: 201, meaning: 'Created. Location header points at the new course; never cached.' },
      { code: 400, meaning: 'Syntactic validation failed — every bad field is listed.' },
      { code: 401, meaning: 'Missing or invalid X-API-Key.' },
      { code: 403, meaning: 'Read-only key used for a write.' },
      { code: 409, meaning: 'Duplicate title + startDate.' },
      { code: 415, meaning: 'Content-Type was not application/json.' },
      { code: 422, meaning: 'startDate is in the past.' },
      { code: 429, meaning: 'Rate limited (20 writes/min per IP).' },
    ],
  },
  {
    id: 'get-course',
    method: 'GET',
    path: '/api/v1/courses/{id}',
    title: 'Get a course by id',
    description: 'The id must be a valid uuid (400 otherwise); unknown ids are 404.',
    statuses: [
      { code: 200, meaning: 'The course.' },
      { code: 400, meaning: 'Malformed uuid.' },
      { code: 404, meaning: 'No course with this id.' },
    ],
  },
  {
    id: 'list-learners',
    method: 'GET',
    path: '/api/v1/learners',
    title: 'List learners',
    description: 'Search name/email with q; paginate with page/limit.',
    query: [
      { name: 'q', type: 'string', description: 'Case-insensitive search over name + email.' },
      { name: 'page', type: 'integer ≥ 1', description: 'Page number (default 1).' },
      { name: 'limit', type: '1–50', description: 'Page size (default 10).' },
    ],
    statuses: [
      { code: 200, meaning: '{ data, meta: { total, page, limit } }' },
      { code: 400, meaning: 'Invalid query.' },
    ],
  },
  {
    id: 'create-learner',
    method: 'POST',
    path: '/api/v1/learners',
    title: 'Create a learner',
    description:
      'Requires the write API key. Email is validated, trimmed and stored lowercase; duplicates are 409. BONUS: send Idempotency-Key for safe retries (10-min TTL).',
    auth: 'write-key',
    bodyExample: { name: 'Zara Iqbal', email: 'zara.iqbal@example.com' },
    statuses: [
      { code: 201, meaning: 'Created.' },
      { code: 400, meaning: 'Syntactic validation failed.' },
      { code: 401, meaning: 'Missing or invalid X-API-Key.' },
      { code: 403, meaning: 'Read-only key used for a write.' },
      { code: 409, meaning: 'Email already registered.' },
      { code: 422, meaning: 'Idempotency-Key reused with a different body.' },
      { code: 429, meaning: 'Rate limited.' },
    ],
  },
  {
    id: 'get-learner',
    method: 'GET',
    path: '/api/v1/learners/{id}',
    title: 'Get a learner by id',
    description: 'Same id rules as courses.',
    statuses: [
      { code: 200, meaning: 'The learner.' },
      { code: 400, meaning: 'Malformed uuid.' },
      { code: 404, meaning: 'No learner with this id.' },
    ],
  },
  {
    id: 'demo-status',
    method: 'GET',
    path: '/api/v1/demo/status/{code}',
    title: 'Return a real status code',
    description:
      'Powers the Status Lab. 204 carries no body; 500 is thrown so it travels through the real error handler.',
    statuses: [
      { code: 200, meaning: 'Demo success.' },
      { code: 201, meaning: 'Demo created.' },
      { code: 204, meaning: 'Demo no-content.' },
      { code: 400, meaning: 'Demo bad request.' },
      { code: 401, meaning: 'Demo unauthorized.' },
      { code: 403, meaning: 'Demo forbidden.' },
      { code: 404, meaning: 'Demo not found.' },
      { code: 429, meaning: 'Demo rate limited.' },
      { code: 500, meaning: 'Demo server error.' },
    ],
  },
  {
    id: 'openapi',
    method: 'GET',
    path: '/openapi.json',
    title: 'OpenAPI 3.1 document',
    description:
      'Generated from the Zod schemas — the docs cannot drift from the validation. Rendered interactively at /reference.',
    statuses: [{ code: 200, meaning: 'The OpenAPI document.' }],
  },
];

/** Autocomplete entries for the Playground path field. */
export const PATH_SUGGESTIONS: string[] = [
  '/api/v1/health',
  '/api/v1/courses',
  '/api/v1/courses?page=1&limit=10',
  '/api/v1/courses?level=beginner',
  '/api/v1/learners',
  '/api/v1/learners?q=areeba',
  '/api/v1/demo/status/200',
  '/api/v1/demo/status/201',
  '/api/v1/demo/status/204',
  '/api/v1/demo/status/400',
  '/api/v1/demo/status/401',
  '/api/v1/demo/status/403',
  '/api/v1/demo/status/404',
  '/api/v1/demo/status/429',
  '/api/v1/demo/status/500',
  '/openapi.json',
];
