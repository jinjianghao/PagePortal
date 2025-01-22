document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const addLinkButton = document.getElementById('addLink');
  const newLinkName = document.getElementById('newLinkName');
  const newLinkURL = document.getElementById('newLinkURL');
  const linkGroup = document.getElementById('linkGroup');
  const linkList = document.getElementById('linkList');
  const saveSettingsButton = document.getElementById('saveSettings');

  // 从存储中加载现有链接
  function loadLinks() {
    chrome.storage.sync.get(['links'], (result) => {
      const links = result.links || [];
      displayLinks(links);
    });
  }

  // 显示链接列表
  function displayLinks(links) {
    linkList.innerHTML = '';
    links.forEach((link, index) => {
      const div = document.createElement('div');
      div.className = 'link-item';
      div.innerHTML = `
        <span>${link.name} - ${link.url}</span>
        <button onclick="deleteLink(${index})" class="btn-delete">删除</button>
      `;
      linkList.appendChild(div);
    });
  }

  // 添加新链接
  addLinkButton.addEventListener('click', () => {
    const name = newLinkName.value.trim();
    const url = newLinkURL.value.trim();
    const group = linkGroup.value;

    if (!name || !url) {
      alert('请填写链接名称和地址');
      return;
    }

    chrome.storage.sync.get(['links'], (result) => {
      const links = result.links || [];
      links.push({
        name: name,
        url: url,
        group: group
      });

      chrome.storage.sync.set({ links: links }, () => {
        console.log('链接已添加');
        newLinkName.value = '';
        newLinkURL.value = '';
        displayLinks(links);
      });
    });
  });

  // 删除链接
  window.deleteLink = function(index) {
    chrome.storage.sync.get(['links'], (result) => {
      const links = result.links || [];
      links.splice(index, 1);
      
      chrome.storage.sync.set({ links: links }, () => {
        console.log('链接已删除');
        displayLinks(links);
      });
    });
  };

  // 保存设置
  saveSettingsButton.addEventListener('click', () => {
    chrome.storage.sync.get(['links'], (result) => {
      const links = result.links || [];
      chrome.storage.sync.set({ links: links }, () => {
        alert('设置已保存');
      });
    });
  });

  // 初始加载链接
  loadLinks();
});
