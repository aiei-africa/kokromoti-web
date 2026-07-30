import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  fetchElections,
  fetchPresidentialByConstituency,
  fetchParliamentaryByConstituency,
  slugify,
  ecCodeFromSlug,
} from '@/lib/seo-api';

type Params = { year: string; constituency: string };

export async function generateStaticParams() {
  const elections = await fetchElections();
  const params: Params[] = [];

  for (const election of elections) {
    const rows = await fetchPresidentialByConstituency(election.code);
    for (const row of rows) {
      params.push({
        year: election.code,
        constituency: `${slugify(row.constituency.name)}-${row.constituency.ecCode.toLowerCase()}`,
      });
    }
  }
  return params;
}

async function getRow(year: string, constituencySlug: string) {
  const ecCode = ecCodeFromSlug(constituencySlug);
  const [presidential, parliamentary] = await Promise.all([
    fetchPresidentialByConstituency(year),
    fetchParliamentaryByConstituency(year),
  ]);
  const pres = presidential.find((r) => r.constituency.ecCode === ecCode);
  const parl = parliamentary.find((r) => r.constituency.ecCode === ecCode);
  return { pres, parl };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pres, parl } = await getRow(params.year, params.constituency);
  const name = pres?.constituency.name ?? parl?.constituency.name;
  if (!name) return {};

  const title = `${name} ${params.year} Election Results — Kokromoti`;
  const description = `Full ${params.year} presidential and parliamentary results for ${name}. Verified data from AIEI — African Institute for Electoral Intelligence.`;
  const url = `https://app.aiei-africa.org/results/${params.year}/${params.constituency}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ConstituencyResultPage({ params }: { params: Params }) {
  const { pres, parl } = await getRow(params.year, params.constituency);
  const name = pres?.constituency.name ?? parl?.constituency.name;
  if (!name) notFound();

  return (
    <main style={{ padding: '2rem' }}>
      <h1>{name} — {params.year} Results</h1>

      {pres && (
        <section>
          <h2>Presidential</h2>
          <ul>
            {pres.results.map((c) => (
              <li key={c.candidate.fullName}>
                {c.candidate.fullName} ({c.candidate.party.abbreviation}): {c.votePct}%
              </li>
            ))}
          </ul>
        </section>
      )}

      {parl && (
        <section>
          <h2>Parliamentary</h2>
          <ul>
            {parl.results.map((c) => (
              <li key={c.candidate.fullName}>
                {c.candidate.fullName} ({c.candidate.party.abbreviation}): {c.votePct}%
              </li>
            ))}
          </ul>
        </section>
      )}

      <a href={`/?year=${params.year}&constituency=${params.constituency}`}>
        View interactive map &amp; full detail →
      </a>
    </main>
  );
}
