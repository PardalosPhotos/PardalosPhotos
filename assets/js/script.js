
const photos = Array.isArray(window.PARDALOS_PHOTOS) ? window.PARDALOS_PHOTOS : [];
const hero = document.querySelector('.hero');
const gallery = document.getElementById('gallery');

function p(name){
  return 'assets/images/' + encodeURIComponent(name).replace(/%2F/g,'/');
}

if (photos.length) hero.style.backgroundImage = `url("${p(photos[0])}")`;

const labels = ['ΓΑΜΟΣ','LOVE STORY','ΒΑΠΤΙΣΗ','ΖΕΥΓΑΡΙ','ΟΙΚΟΓΕΝΕΙΑ'];
const picks = [0, Math.min(7,photos.length-1), Math.min(15,photos.length-1), Math.min(23,photos.length-1), Math.min(31,photos.length-1)];

picks.forEach((idx,i)=>{
  if (!photos[idx]) return;
  const card=document.createElement('figure');
  card.className='portfolio-card';
  const img=document.createElement('img');
  img.src=p(photos[idx]);
  img.alt=labels[i]+' - Pardalos Photos & Videos';
  img.loading='lazy';
  img.onerror=()=>card.remove();
  const cap=document.createElement('figcaption');
  cap.className='cap';
  cap.innerHTML=`${labels[i]}<small>SELECTED WORK</small>`;
  card.append(img,cap);
  gallery.appendChild(card);
});

gallery?.addEventListener('click',e=>{
  const card=e.target.closest('.portfolio-card');
  if(!card)return;
  const lb=document.querySelector('.lightbox');
  lb.querySelector('img').src=card.querySelector('img').src;
  lb.classList.add('open');
});

document.querySelector('.lightbox button')?.addEventListener('click',()=>document.querySelector('.lightbox').classList.remove('open'));
document.querySelector('.lightbox')?.addEventListener('click',e=>{if(e.target.classList.contains('lightbox'))e.currentTarget.classList.remove('open')});
document.querySelector('.nav-toggle')?.addEventListener('click',()=>document.querySelector('.navlinks').classList.toggle('open'));
document.querySelectorAll('.navlinks a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.navlinks').classList.remove('open')));
