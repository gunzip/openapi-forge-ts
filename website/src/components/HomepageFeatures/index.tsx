import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Type-Safe Client Generation',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Generate operation-based TypeScript clients with <strong>Zod v4 validation</strong>, 
        discriminated union response types, and comprehensive error handling. 
        Each operation is tree-shakable and fully typed.
      </>
    ),
  },
  {
    title: 'Multi-Version OpenAPI Support',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Supports <strong>OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x</strong> specifications. 
        All input formats are automatically normalized to OpenAPI 3.1.0 before generation.
        Works with local files or remote URLs.
      </>
    ),
  },
  {
    title: 'Minimal Dependencies & Fast',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        <strong>No runtime dependencies</strong> except Zod. Optimized for quick generation 
        times even with large specs. Works in Node.js and browsers with 
        <strong> ESM-first output</strong>.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
