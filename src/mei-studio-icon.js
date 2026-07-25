import React from 'react';
import iconNs from '@ant-design/icons';

const Icon = iconNs.default || iconNs;

export function MeiStudioIconComponent() {
  return (
    <svg height="1em" style={{ enableBackground: 'new 0 0 1000 1000' }} width="1em" viewBox="0 0 1000 1000">
      <path
        d="M748.5 798.54c0 39.08-31.68 70.75-70.75 70.75H176.93c-39.08 0-70.75-31.68-70.75-70.75V90.75c0-39.08 31.68-70.75 70.75-70.75h364.8L748.5 235.83"
        style={{
          fill: '#f2f2f2',
        }}
        />
      <path
        d="M106.17 487.86V90.75c0-39.08 31.68-70.75 70.75-70.75h364.8L748.5 235.83v562.71c0 39.08-31.68 70.75-70.75 70.75H214.02"
        style={{
          fill: '#f2f2f2',
          stroke: '#666',
          strokeWidth: 40,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeMiterlimit: 10,
        }}
        />
      <path
        d="M529.46 30.83v146.03c0 40.1 32.51 72.61 72.61 72.61h136.84"
        style={{
          fill: '#f2f2f2',
          stroke: '#666',
          strokeWidth: 40,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeMiterlimit: 10,
        }}
        />
      <path
        d="M24.5 782.254q-9.973 0-15.253-5.573-5.28-5.573-5.28-15.547v-169.84q0-9.973 5.574-15.546 5.866-5.574 15.84-5.574 8.8 0 13.786 3.52 5.28 3.227 9.68 11.44l67.76 123.787h-9.973l67.76-123.787q4.4-8.213 9.387-11.44 5.28-3.52 13.786-3.52 9.974 0 15.254 5.574 5.573 5.573 5.573 15.546v169.84q0 9.974-5.28 15.547t-15.253 5.573q-9.974 0-15.547-5.573-5.28-5.573-5.28-15.547v-118.8h6.453l-54.56 97.68q-3.52 5.574-7.626 8.507-3.814 2.64-10.267 2.64-6.453 0-10.56-2.933-4.107-2.934-7.333-8.214l-55.147-97.973h7.04v119.093q0 9.974-5.28 15.547-4.987 5.573-15.253 5.573zm260.35-2.64q-11.44 0-17.6-6.16-6.16-6.16-6.16-17.6v-159.28q0-11.44 6.16-17.6 6.16-6.16 17.6-6.16h102.374q8.8 0 13.2 4.694 4.693 4.4 4.693 12.906 0 8.8-4.694 13.494-4.4 4.4-13.2 4.4h-82.72v48.4h75.974q9.093 0 13.493 4.693 4.693 4.4 4.693 13.2 0 8.8-4.693 13.493-4.4 4.4-13.493 4.4h-75.973v51.627h82.72q8.8 0 13.2 4.693 4.693 4.4 4.693 12.907 0 8.8-4.694 13.493-4.4 4.4-13.2 4.4zm177.337 2.64q-11.147 0-17.014-6.16-5.866-6.16-5.866-17.306V593.64q0-11.147 5.866-17.307 5.867-6.16 17.014-6.16 10.853 0 16.72 6.16 5.866 6.16 5.866 17.307v165.147q0 11.146-5.866 17.306-5.574 6.16-16.72 6.16z"
        aria-label="MEI"
        style={{
          fontWeight: 800,
          fontSize: '293.333px',
          lineHeight: 1,
          fontFamily: 'Nunito',
          InkscapeFontSpecification: '&quot',
          textAlign: 'center',
          letterSpacing: '.75px',
          wordSpacing: 0,
          textAnchor: 'middle',
          fill: '#333',
          fillOpacity: 0.547244,
          strokeWidth: 13.3333,
          strokeOpacity: 0.686024,
        }}
        />
    </svg>
  );
}

function MeiStudioIcon() {
  return (
    <Icon component={MeiStudioIconComponent} />
  );
}

export default MeiStudioIcon;
