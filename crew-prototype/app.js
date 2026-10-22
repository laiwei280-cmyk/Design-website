(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const names = ['张品俊','王治权','靳海荣','陈家阳','辛佳宁','李茜','操龙祥','宋倩倩','房笑阳','金步扬'];
  const codes = ['YCH0338','YCH0340','YCH0339','YCH0342','YCH0341','YHL0164','YHL0165','YXY0019','YXY0020','YXY0018'];
  const roles = ['乘务员','乘务员','乘务员','水手','娱乐服务员','餐厅服务员','餐厅服务员','保洁员','餐厅服务员','餐厅服务员'];
  const phones = ['18525220957','13513660470','13881559836','18126639276','15321052888','1808****534','1329****612','1536****282','1312****745','1851****622'];
  const ids = ['341223482719362110','430722615084930070','622427307196547318','440811859230470000','411624174608351925','511725********86128','340824********94834','341202********83144','371203********10362','340803********1287X'];
  const birthdays = ['1996年10月8日','1995年11月7日','1991年1月1日','1990年7月8日','1996年2月15日','—','—','—','—','—'];
  const addresses = ['江苏省南京市建邺区江东中路188号锦绣华庭3栋1204室','浙江省杭州市西湖区文三路268号云栖花园6栋802室','广东省广州市天河区体育西路156号景悦公馆2栋1503室','四川省成都市武侯区人民南路四段88号锦城雅苑9栋1102室','湖北省武汉市洪山区珞喻路312号湖畔新城5栋706室','山东省青岛市市南区香港中路168号海景花园12栋902室','福建省厦门市思明区湖滨南路1288号鹭岛家园8栋1601室','陕西省西安市雁塔区长安南路99号曲江雅居4栋1005室','湖南省长沙市岳麓区潇湘中路66号麓山花园7栋503室','辽宁省大连市沙河口区黄河路118号滨海名都10栋1302室'];
  let records = names.map((name,i)=>({ key:codes[i], name, code:codes[i], department:i<3?'乘务部':i===3?'甲板部':'服务部', role:roles[i], phone:phones[i], id:ids[i], birthday:birthdays[i], address:addresses[i], company:i<5?'长航':i<7?'海陆':'鑫裕盛', gender:[4,5,7,8].includes(i)?'女':'男', asset:i }));
  const state = {expanded:new Set(), selected:new Set(), favorites:new Set(), onlyFavorites:false, department:'',role:'',query:'',page:1,pageSize:10,changed:false};
  const presentation = new URLSearchParams(location.search);
  if (presentation.get('view') === 'expanded') records.forEach(r => state.expanded.add(r.key));
  if (presentation.has('embed')) document.documentElement.classList.add('embedded');
  let menuKind = null, focusBeforeModal = null, toastTimer;
  const rowNodes = new Map();
  const escapeHTML = (v) => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function fit() {
    document.documentElement.style.setProperty('--scale',String(Math.min(innerWidth/1440,innerHeight/800)));
  }
  addEventListener('resize',fit); fit();

  function filtered() {
    return records.filter(r=>(!state.query||(r.name+' '+r.code).toLowerCase().includes(state.query))&&(!state.department||r.department===state.department)&&(!state.role||r.role===state.role)&&(!state.onlyFavorites||state.favorites.has(r.key)));
  }
  function visibleRecords() { return filtered().slice((state.page-1)*state.pageSize,state.page*state.pageSize); }
  function hasFilter() {return Boolean(state.query||state.department||state.role||state.onlyFavorites);}

  function hotspot(className,label,handler) {
    const b=document.createElement('button'); b.className='hotspot '+className; b.type='button'; b.setAttribute('aria-label',label); b.title=label; b.addEventListener('click',handler); return b;
  }
  function nativeCell(node,text,x,y,width,className='') {
    const c=document.createElement('span'); c.className='dynamic-cell '+className; c.textContent=text; Object.assign(c.style,{left:x+'px',top:y+'px',width:width+'px'}); node.append(c);
  }
  function nativeRowArt(node,r,open) {
    node.classList.add('native-row');
    const box=document.createElement('span');box.className='native-check';node.append(box);
    const star=document.createElement('span');star.className='native-star';star.textContent='☆';node.append(star);
    if(!open) {
      nativeCell(node,r.name,88,5,80,'name-text');nativeCell(node,r.code,88,22,100,'code-text');
      nativeCell(node,r.department,208,12,108);nativeCell(node,r.role,328,12,100,'tag-text');
      nativeCell(node,r.company+'丨外聘船员',447,12,142);nativeCell(node,r.phone,608,12,125);
      nativeCell(node,r.id,748,12,168);nativeCell(node,r.address,930,12,158);
      nativeCell(node,'编辑',1118,12,34,'action-text');nativeCell(node,'删除',1162,12,34,'action-text');
    } else {
      nativeCell(node,r.name,88,16,60,'name-text');nativeCell(node,(r.gender==='女'?'♀':'♂')+' 丨 '+r.code,150,16,230);
      nativeCell(node,r.department,90,46,90);nativeCell(node,r.role,88,70,92,'tag-text');
      nativeCell(node,r.company,211,46,90);nativeCell(node,'外聘船员',211,70,90);
      nativeCell(node,'手机号码    '+r.phone,323,46,220);nativeCell(node,'出生日期    '+r.birthday,323,70,220);
      nativeCell(node,'身份证号    '+r.id,550,46,400);nativeCell(node,'家庭住址    '+r.address,550,70,530);
      nativeCell(node,'编辑',1128,45,28,'action-text');nativeCell(node,'删除',1168,45,28,'action-text');
    }
  }
  function makeRow(r) {
    const node=document.createElement('article');node.className='crew-row';node.dataset.key=r.key;node.setAttribute('role','listitem');node.setAttribute('aria-label',r.name+' '+r.code+' '+r.department+' '+r.role);
    if(r.asset!==undefined&&!r.modified) {
      for(const [kind,height] of [['compact',46],['expanded',112]]) {
        const img=document.createElement('img');img.src=`assets/row-${r.asset}-${kind}@2x.png`;img.width=1208;img.height=height;img.alt='';img.draggable=false;img.className='row-image '+(kind==='expanded'?'detail':'compact');node.append(img);
      }
    } else nativeRowArt(node,r,state.expanded.has(r.key));
    const check=document.createElement('input');check.type='checkbox';check.className='check-control row-check';check.setAttribute('aria-label','选择'+r.name);check.checked=state.selected.has(r.key);
    check.addEventListener('change',()=>{check.checked?state.selected.add(r.key):state.selected.delete(r.key);updateSelection();});node.append(check);
    const star=hotspot('star-control row-star','收藏'+r.name,()=>{state.favorites.has(r.key)?state.favorites.delete(r.key):state.favorites.add(r.key);star.setAttribute('aria-pressed',String(state.favorites.has(r.key)));if(state.onlyFavorites)render();});star.setAttribute('aria-pressed',String(state.favorites.has(r.key)));node.append(star);
    const toggle=hotspot('row-name','展开'+r.name+'的档案',()=>{
      const opening=!state.expanded.has(r.key);opening?state.expanded.add(r.key):state.expanded.delete(r.key);
      if(r.modified||r.asset===undefined){rowNodes.delete(r.key);render();return;}
      applyRowState(node,r);updateHeader();
    });toggle.setAttribute('aria-controls','details-'+r.key);node.id='details-'+r.key;node.append(toggle);
    node.append(hotspot('row-edit','编辑'+r.name,()=>editRecord(r)),hotspot('row-delete','删除'+r.name,()=>deleteRecord(r)));
    applyRowState(node,r);return node;
  }
  function applyRowState(node,r) {
    const open=state.expanded.has(r.key);node.classList.toggle('expanded',open);
    const toggle=node.querySelector('.row-name');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',(open?'收起':'展开')+r.name+'的档案');toggle.title=(open?'收起':'展开')+r.name+'的档案';
  }
  function updateHeader() { $('table-header').classList.toggle('is-expanded',state.expanded.size>0); }
  function updateSelection() {
    const visible=visibleRecords();const count=visible.filter(r=>state.selected.has(r.key)).length;
    $('select-all').checked=visible.length>0&&count===visible.length;$('select-all').indeterminate=count>0&&count<visible.length;
  }
  function render() {
    const scroll=$('rows').scrollTop;const visible=visibleRecords();const fragment=document.createDocumentFragment();
    for(const r of visible) {let node=rowNodes.get(r.key);if(!node){node=makeRow(r);rowNodes.set(r.key,node);}fragment.append(node);}
    if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='暂无数据';fragment.append(empty);}
    $('rows').replaceChildren(fragment);$('rows').scrollTop=scroll;updateHeader();updateSelection();
    $('result-count').hidden=!hasFilter()&&!state.changed;
    $('result-count').textContent='共计 '+filtered().length+' 条';
    renderPager();
  }
  function renderPager() {
    const labels=[['上一页',668],['1',704],['4',776],['5',812],['6',848],['7',884],['50',956],['下一页',992]];
    const nodes=labels.map(([label,x])=>{
      const b=hotspot('page-button',label==='上一页'||label==='下一页'?label:'第'+label+'页',()=>{
        state.page=label==='上一页'?Math.max(1,state.page-1):label==='下一页'?Math.min(50,state.page+1):Number(label);$('rows').scrollTop=0;render();
      });b.style.left=x+'px';
      if(state.page!==1){b.classList.add('changed');b.textContent=label==='1'?String(state.page):label==='上一页'?'‹':label==='下一页'?'›':label; if(label==='1')b.classList.add('active');}
      b.disabled=(label==='上一页'&&state.page===1)||(label==='下一页'&&state.page===50);if(label==='1')b.setAttribute('aria-current','page');return b;
    });$('pager').replaceChildren(...nodes);
  }
  $('search').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();e.target.classList.toggle('has-value',Boolean(e.target.value));state.page=1;render();});
  $('search').addEventListener('keydown',e=>{if(e.key==='Escape'){e.target.value='';e.target.dispatchEvent(new Event('input'));e.target.blur();}});
  $('select-all').addEventListener('change',e=>{for(const r of visibleRecords()){e.target.checked?state.selected.add(r.key):state.selected.delete(r.key);const n=rowNodes.get(r.key);if(n)n.querySelector('.row-check').checked=e.target.checked;}updateSelection();});
  $('favorites').addEventListener('click',()=>{state.onlyFavorites=!state.onlyFavorites;$('favorites').setAttribute('aria-pressed',String(state.onlyFavorites));state.page=1;render();});
  $('page-size').addEventListener('change',e=>{state.pageSize=Number(e.target.value);state.page=1;e.target.classList.add('changed');render();});
  $('page-jump').addEventListener('keydown',e=>{if(e.key==='Enter'){const value=Number(e.target.value);if(Number.isInteger(value)&&value>=1&&value<=50){state.page=value;render();e.target.blur();}}});

  function closeMenu(){ $('menu').hidden=true;if(menuKind)$(menuKind).setAttribute('aria-expanded','false');menuKind=null; }
  function openMenu(kind) {
    if(menuKind===kind){closeMenu();return;}closeMenu();menuKind=kind;$(kind).setAttribute('aria-expanded','true');
    const values=kind==='department'?['','乘务部','甲板部','服务部']:['',...new Set(roles)];const menu=$('menu');menu.replaceChildren();
    menu.style.left=(kind==='department'?444:564)+'px';menu.style.top='158px';
    values.forEach(value=>{const button=document.createElement('button');button.className='menu-option';button.role='option';button.setAttribute('aria-selected',String(state[kind]===value));button.textContent=value||(kind==='department'?'全部部门':'全部岗位');button.addEventListener('click',()=>{state[kind]=value;state.page=1;$(kind).classList.toggle('has-value',Boolean(value));$(kind).querySelector('span').textContent=(kind==='department'?'部门: ':'主岗位: ')+value;closeMenu();render();$(kind).focus();});menu.append(button);});
    menu.hidden=false;menu.querySelector('button').focus();
  }
  $('department').addEventListener('click',()=>openMenu('department'));$('role').addEventListener('click',()=>openMenu('role'));
  document.addEventListener('click',e=>{if(menuKind&&!$('menu').contains(e.target)&&!$(menuKind).contains(e.target))closeMenu();});
  $('menu').addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const buttons=[...$('menu').querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}});

  function openModal(title,content,small=false) {
    closeMenu();focusBeforeModal=document.activeElement;const modal=$('modal');modal.classList.toggle('small',small);modal.innerHTML='<div class="modal-head"><h2 id="modal-title">'+escapeHTML(title)+'</h2><button class="close" aria-label="关闭">×</button></div>'+content;
    $('modal-layer').hidden=false;$('rows').inert=true;document.querySelector('.workspace').inert=true;modal.querySelector('.close').addEventListener('click',closeModal);modal.querySelector('input,select,button:not(.close)')?.focus();
  }
  function closeModal(){ $('modal-layer').hidden=true;$('rows').inert=false;document.querySelector('.workspace').inert=false;focusBeforeModal?.focus(); }
  $('modal-layer').addEventListener('click',e=>{if(e.target===$('modal-layer'))closeModal();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(!$('modal-layer').hidden)closeModal();else closeMenu();}
    if(e.key==='Tab'&&!$('modal-layer').hidden){const elements=[...$('modal').querySelectorAll('button,input,select,a[href]')].filter(n=>!n.disabled&&!n.hidden);const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2200);}
  function editRecord(record) {
    const fields=[['name','姓名',true],['code','工号',true],['gender','性别'],['phone','手机号码',true],['department','部门',true],['role','主岗位',true],['company','合同单位'],['birthday','出生日期'],['id','身份证号'],['address','家庭住址']];
    const options={gender:['男','女'],department:['乘务部','甲板部','服务部'],role:[...new Set(roles)],company:['长航','海陆','鑫裕盛']};
    const html=fields.map(([key,label,required])=>'<label class="field '+(key==='address'?'wide':'')+'"><span class="'+(required?'required':'')+'">'+label+'</span>'+(options[key]?'<select name="'+key+'" '+(required?'required':'')+'><option value="">请选择'+label+'</option>'+options[key].map(v=>'<option '+(record?.[key]===v?'selected':'')+'>'+v+'</option>').join('')+'</select>':'<input name="'+key+'" value="'+escapeHTML(record?.[key]||'')+'" '+(required?'required':'')+(key==='phone'?' pattern="[0-9*+ -]{7,20}"':'')+' autocomplete="off">')+'</label>').join('');
    openModal(record?'编辑船员档案':'新建船员档案','<form id="record-form"><div class="form-grid">'+html+'</div><div class="modal-actions"><button class="button cancel" type="button">取消</button><button class="button primary" type="submit">保存档案</button></div></form>');
    $('modal').querySelector('.cancel').addEventListener('click',closeModal);
    $('record-form').addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target));if(records.some(r=>r.code===values.code&&r.key!==record?.key)){e.target.elements.code.setCustomValidity('工号已存在');e.target.elements.code.reportValidity();e.target.elements.code.oninput=()=>e.target.elements.code.setCustomValidity('');return;}
      const changed={...record,...values,key:record?.key||'new-'+Date.now(),modified:true};
      if(record)records=records.map(r=>r.key===record.key?changed:r);else records.unshift(changed);
      rowNodes.delete(changed.key);state.changed=true;state.page=1;closeModal();render();toast('档案已保存');
    });
  }
  function deleteRecord(record) {
    openModal('删除船员档案','<p>确定删除 '+escapeHTML(record.name)+' 的档案？</p><div class="modal-actions"><button class="button cancel">取消</button><button class="button danger confirm">确认删除</button></div>',true);
    $('modal').querySelector('.cancel').addEventListener('click',closeModal);
    $('modal').querySelector('.confirm').addEventListener('click',()=>{records=records.filter(r=>r.key!==record.key);state.expanded.delete(record.key);state.selected.delete(record.key);state.favorites.delete(record.key);rowNodes.delete(record.key);state.changed=true;closeModal();render();toast('档案已删除');});
  }
  function downloadTemplate() {
    const csv='\ufeff姓名,工号,性别,手机号码,部门,主岗位,合同单位,出生日期,身份证号,家庭住址\r\n';
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='船员档案导入模板.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }
  function parseCSV(text) {
    const rows=[];let cells=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){cells.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;cells.push(cell);if(cells.some(v=>v.trim()))rows.push(cells);cells=[];cell='';}else cell+=c;}
    cells.push(cell);if(cells.some(v=>v.trim()))rows.push(cells);return rows;
  }
  function uploadRecords() {
    openModal('批量上传船员档案','<form id="upload-form"><div class="upload-box"><p>上传船员档案</p><input id="upload-file" type="file" accept=".csv,text/csv" required aria-label="选择船员档案 CSV 文件"><p>使用模板填写档案后上传 CSV 文件</p><button class="button download-template" type="button">下载模板</button></div><p id="upload-error" role="alert" hidden></p><div class="modal-actions"><button class="button cancel" type="button">取消</button><button class="button primary" type="submit">开始上传</button></div></form>');
    $('modal').querySelector('.cancel').addEventListener('click',closeModal);$('modal').querySelector('.download-template').addEventListener('click',downloadTemplate);
    $('upload-form').addEventListener('submit',async e=>{e.preventDefault();const file=$('upload-file').files[0];if(!file)return;const error=$('upload-error');
      if(file.size>10*1024*1024){error.hidden=false;error.textContent='文件大小不能超过10MB';return;}
      const rows=parseCSV((await file.text()).replace(/^\ufeff/,''));const expected=['姓名','工号','性别','手机号码','部门','主岗位','合同单位','出生日期','身份证号','家庭住址'];
      if(!rows.length||expected.some((h,i)=>rows[0][i]?.trim()!==h)){error.hidden=false;error.textContent='表头与模板不一致，请使用导入模板';return;}
      const existing=new Set(records.map(r=>r.code));const valid=[],invalid=[];const keys=['name','code','gender','phone','department','role','company','birthday','id','address'];
      rows.slice(1).forEach((cells,i)=>{const r=Object.fromEntries(keys.map((key,j)=>[key,(cells[j]||'').trim()]));if(!r.name||!r.code||!r.phone||!r.department||!r.role||existing.has(r.code)){invalid.push(i+2);return;}existing.add(r.code);valid.push({...r,key:'import-'+Date.now()+'-'+i,modified:true});});
      if(invalid.length||!valid.length){error.hidden=false;error.textContent=invalid.length?'请检查第 '+invalid.join('、')+' 行的必填内容与工号是否重复':'文件中没有可导入的档案';return;}
      records.unshift(...valid);state.changed=true;state.page=1;closeModal();render();toast('已导入 '+valid.length+' 条档案');
    });
  }
  $('create').addEventListener('click',()=>editRecord());$('template').addEventListener('click',downloadTemplate);
  for(let i=0;i<10;i++){const image=new Image();image.src=`assets/row-${i}-expanded@2x.png`;}
  render();
})();
