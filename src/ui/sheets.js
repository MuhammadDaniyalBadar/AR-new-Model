import { esc, html } from '../utils/dom.js';
import { describeDimensions, formatPrice, formatWeight } from '../utils/format.js';
import { icons } from './icons.js';

/*
 * Content for the bottom sheet. Everything shown comes straight from the
 * product file. Nothing is inferred from the 3D model (SOW §7.5).
 */

function facts(rows) {
  const items = rows.filter(([, value]) => value);
  if (!items.length) return '';
  return `<dl class="facts">${items
    .map(([term, value]) => `<div class="facts__row"><dt>${esc(term)}</dt><dd>${esc(value)}</dd></div>`)
    .join('')}</dl>`;
}

/**
 * @param {object} def   component definition
 * @param {{index:number, total:number, onPrev:()=>void, onNext:()=>void}} nav
 */
export function componentSheet(def, { index, total, onPrev, onNext }) {
  const info = def.info ?? {};
  const el = html(`
    <article class="detail">
      <div class="detail__nav">
        <button class="icon-button" type="button" data-nav="prev" aria-label="Previous part" ${index === 0 ? 'disabled' : ''}>${icons.prev}</button>
        <span class="detail__count">${index + 1} of ${total}</span>
        <button class="icon-button" type="button" data-nav="next" aria-label="Next part" ${index === total - 1 ? 'disabled' : ''}>${icons.next}</button>
      </div>
      <h2 class="detail__title" tabindex="-1">${esc(def.name)}</h2>
      ${info.description ? `<p class="detail__text">${esc(info.description)}</p>` : ''}
      ${facts([
        ['Weight', formatWeight(info.weightG)],
        ['Size', info.size],
      ])}
      ${
        info.mainIngredients?.length
          ? `<h3 class="detail__subhead">Main ingredients</h3>
             <ul class="chips">${info.mainIngredients.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        info.allergens?.length
          ? `<h3 class="detail__subhead">Contains</h3><p class="detail__text">${esc(info.allergens.join(', '))}</p>`
          : ''
      }
      ${info.notes ? `<p class="detail__note">${esc(info.notes)}</p>` : ''}
    </article>`);
  el.querySelector('[data-nav="prev"]').addEventListener('click', onPrev);
  el.querySelector('[data-nav="next"]').addEventListener('click', onNext);
  return el;
}

/**
 * @param {object} product
 * @param {(index:number)=>void} onPick  open a component
 */
export function productSheet(product, onPick) {
  const components = product.components ?? [];
  const el = html(`
    <article class="detail">
      <h2 class="detail__title detail__title--large" tabindex="-1">${esc(product.name)}</h2>
      ${product.description ? `<p class="detail__text">${esc(product.description)}</p>` : ''}
      ${facts([
        ['Size', describeDimensions(product.dimensions)],
        ['Weight', formatWeight(product.weightG)],
        ['Price', formatPrice(product.price)],
      ])}
      ${
        components.length
          ? `<h3 class="detail__subhead">What's inside, top to bottom</h3>
             <ol class="inside">${components
               .map(
                 (c, i) => `<li><button type="button" class="inside__item" data-index="${i}">
                   <span class="inside__name">${esc(c.name)}</span>
                   <span class="inside__weight">${esc(formatWeight(c.info?.weightG))}</span>
                 </button></li>`,
               )
               .join('')}</ol>`
          : ''
      }
    </article>`);
  el.querySelectorAll('[data-index]').forEach((btn) =>
    btn.addEventListener('click', () => onPick(Number(btn.dataset.index))),
  );
  return el;
}

const AR_HELP = {
  insecure: {
    title: 'AR needs a secure link',
    text: 'Open this page over https:// to use AR. For phone testing, run "npm run dev:phone" and open the https address it prints.',
  },
  'ios-browser': {
    title: 'AR isn’t available in this browser',
    text: 'Open this page in Safari to place the dish on your table.',
  },
  device: {
    title: 'AR works on phones',
    text: 'Open this page on an iPhone, or an Android phone with Google Play Services for AR, to place the dish on your table at real size. You can still turn it and take it apart here.',
  },
};

export function arHelpSheet(reason) {
  const copy = AR_HELP[reason] ?? AR_HELP.device;
  return html(`
    <article class="detail">
      <h2 class="detail__title" tabindex="-1">${esc(copy.title)}</h2>
      <p class="detail__text">${esc(copy.text)}</p>
    </article>`);
}
