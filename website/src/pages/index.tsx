import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Get Started ⚡️
          </Link>
          <Link
            className="button button--outline button--lg margin-left--md"
            href="https://github.com/gunzip/yanogen-ts">
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageDemo() {
  return (
    <section className={styles.demo}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <div className="text--center">
              <Heading as="h2">See YanoGen-Ts in Action</Heading>
              <p>
                Watch how YanoGen-Ts transforms OpenAPI specifications into fully-typed TypeScript code:
              </p>
              <img 
                src="/yanogen-ts/img/yanogen-demo.gif" 
                alt="YanoGen-Ts Demo"
                style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageQuickStart() {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <Heading as="h2">Quick Start</Heading>
            <p>Get started with YanoGen-Ts in seconds:</p>
            <pre>
              <code>
{`npx yanogen-ts generate \\
  --generate-client \\
  -i openapi.yaml \\
  -o ./generated`}
              </code>
            </pre>
          </div>
          <div className="col col--6">
            <Heading as="h2">Type-Safe Usage</Heading>
            <p>Use the generated client with full type safety:</p>
            <pre>
              <code>
{`import { getPetById } from './generated/operations';

const pet = await getPetById({ petId: '123' });

if (pet.status === 200) {
  // pet.data is fully typed
  console.log(pet.data.name);
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - TypeScript OpenAPI Client Generator`}
      description="Generate fully-typed Zod v4 schemas and type-safe REST API clients from OpenAPI 2.0, 3.0.x, and 3.1.x specifications">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <HomepageDemo />
        <HomepageQuickStart />
      </main>
    </Layout>
  );
}
