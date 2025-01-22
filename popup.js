document.addEventListener('DOMContentLoaded', function() {
  // 清除存储的链接（仅用于测试）
  // chrome.storage.sync.clear(() => {
  //   console.log('存储已清除');
  // });

  const searchInput = document.getElementById('searchLinks');
  const groupsContainer = document.getElementById('groupsContainer');
  const contextMenu = document.getElementById('contextMenu');
  let currentContextTarget = null;

  // 初始化加载数据
  async function initializeData() {
    try {
      const result = await chrome.storage.sync.get(['links', 'groups']);
      const userLinks = result.links || [];
      const groups = result.groups || [];
      
      // 按分组整理链接
      const groupedLinks = {};
      // 首先添加已定义的分组
      groups.forEach(group => {
        groupedLinks[group] = [];
      });
      // 添加未分组
      groupedLinks['未分组'] = [];
      
      // 分配链接到对应分组
      userLinks.forEach((link) => {
        const group = link.group || '未分组';
        if (!groupedLinks[group]) {
          groupedLinks[group] = [];
        }
        groupedLinks[group].push(link);
      });

      renderGroups(groupedLinks);
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败，请重试');
    }
  }

  // 渲染分组和链接
  function renderGroups(groupedLinks) {
    groupsContainer.innerHTML = '';
    
    Object.keys(groupedLinks).forEach((groupName) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group-container';
      groupDiv.dataset.group = groupName;
      
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      groupHeader.dataset.group = groupName;
      
      const groupTitle = document.createElement('div');
      groupTitle.className = 'group-title';
      groupTitle.textContent = groupName;
      
      const openAllBtn = document.createElement('button');
      openAllBtn.className = 'open-all-btn';
      openAllBtn.textContent = '打开全部';
      
      const groupContent = document.createElement('div');
      groupContent.className = 'group-content';
      
      // 折叠功能
      groupHeader.addEventListener('click', (e) => {
        if (e.target !== openAllBtn) {
          groupDiv.classList.toggle('group-collapsed');
        }
      });
      
      // 拖拽目标区域
      groupDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
        groupDiv.classList.add('drag-over');
      });
      
      groupDiv.addEventListener('dragleave', () => {
        groupDiv.classList.remove('drag-over');
      });
      
      groupDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        groupDiv.classList.remove('drag-over');
        
        const linkData = JSON.parse(e.dataTransfer.getData('text/plain'));
        moveLink(linkData, groupName);
      });
      
      // 渲染该分组下的所有链接
      groupedLinks[groupName].forEach((link) => {
        const button = createLinkButton(link);
        groupContent.appendChild(button);
      });
      
      // 打开全部按钮功能
      openAllBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        groupedLinks[groupName].forEach(link => {
          chrome.tabs.create({ url: link.url });
        });
      });
      
      groupHeader.appendChild(groupTitle);
      groupHeader.appendChild(openAllBtn);
      groupDiv.appendChild(groupHeader);
      groupDiv.appendChild(groupContent);
      groupsContainer.appendChild(groupDiv);
    });
  }

  // 创建链接按钮的函数
  function createLinkButton(link) {
    const button = document.createElement('button');
    button.className = 'link-button';
    button.textContent = link.name;
    button.draggable = true;
    button.dataset.url = link.url;
    button.dataset.name = link.name;
    button.dataset.group = link.group;
    
    button.title = '单击打开链接，右键显示更多操作，拖拽可移动到其他分组';
    
    button.addEventListener('dragstart', (e) => {
      button.classList.add('dragging');
      e.dataTransfer.setData('text/plain', JSON.stringify({
        name: link.name,
        url: link.url,
        currentGroup: link.group
      }));
    });
    
    button.addEventListener('dragend', () => {
      button.classList.remove('dragging');
    });
    
    // 修改单击事件，确保链接正确打开
    button.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        chrome.tabs.create({ url: link.url });
      }
    });

    return button;
  }

  // 搜索功能更新
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const groups = document.querySelectorAll('.group-container');
    
    groups.forEach(group => {
      const buttons = group.querySelectorAll('button');
      let hasVisibleLinks = false;
      
      buttons.forEach(button => {
        if (button.classList.contains('open-all-btn')) return;
        
        const text = button.textContent.toLowerCase();
        const isVisible = text.includes(searchTerm);
        button.style.display = isVisible ? 'block' : 'none';
        if (isVisible) hasVisibleLinks = true;
      });
      
      group.style.display = hasVisibleLinks ? 'block' : 'none';
    });
  });

  // 错误处理和加载状态
  const openLink = async (url) => {
    try {
      const button = document.querySelector(`button[data-url="${url}"]`);
      button.disabled = true;
      button.textContent = '加载中...';
      
      await chrome.tabs.create({ url });
      
      button.disabled = false;
      button.textContent = button.getAttribute('data-original-text');
    } catch (error) {
      console.error('打开链接失败:', error);
      alert('打开链接失败，请检查网络连接');
    }
  };

  // 移动链接到新分组
  function moveLink(linkData, newGroup) {
    chrome.storage.sync.get(['links'], (result) => {
      const links = result.links || [];
      const linkIndex = links.findIndex(l => l.url === linkData.url);
      
      if (linkIndex !== -1) {
        links[linkIndex].group = newGroup;
        chrome.storage.sync.set({ links }, () => {
          // 重新加载显示
          location.reload();
        });
      }
    });
  }

  // 显示右键菜单
  function showContextMenu(e, target) {
    e.preventDefault();
    e.stopPropagation();
    currentContextTarget = target;
    
    const isGroup = target.classList.contains('group-container') || target.closest('.group-header');
    const isLink = target.classList.contains('link-button');
    
    Array.from(contextMenu.children).forEach(item => {
      if (item.classList.contains('context-menu-separator')) return;
      
      const action = item.dataset.action;
      const menuItem = item;
      
      switch(action) {
        case 'new-group':
          menuItem.style.display = 'flex';
          menuItem.innerHTML = '<i>➕</i> 新建分组';
          break;
        case 'edit':
          menuItem.style.display = (isGroup || isLink) ? 'flex' : 'none';
          menuItem.innerHTML = `<i>✏️</i> ${isGroup ? '编辑分组名称' : '编辑链接名称'}`;
          break;
        case 'delete':
          menuItem.style.display = (isGroup || isLink) ? 'flex' : 'none';
          menuItem.innerHTML = `<i>🗑️</i> ${isGroup ? '删除分组' : '删除链接'}`;
          break;
      }
    });

    const x = e.clientX;
    const y = e.clientY;
    const menuWidth = 160;
    const menuHeight = contextMenu.offsetHeight;
    
    let left = x;
    let top = y;
    
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 5;
    }
    
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight - 5;
    }
    
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
    contextMenu.style.display = 'block';
    
    // 添加动画效果
    requestAnimationFrame(() => {
      contextMenu.classList.add('visible');
    });
  }

  // 隐藏右键菜单
  function hideContextMenu() {
    contextMenu.classList.remove('visible');
    setTimeout(() => {
      contextMenu.style.display = 'none';
      currentContextTarget = null;
    }, 100);
  }

  // 修改事件监听器
  document.removeEventListener('contextmenu', hideContextMenu); // 移除可能的重复监听器
  document.addEventListener('contextmenu', (e) => {
    const target = e.target.closest('.group-container, .link-button, .group-header');
    if (target) {
      showContextMenu(e, target);
    } else {
      hideContextMenu();
    }
  });

  // 点击其他地方关闭菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#contextMenu')) {
      hideContextMenu();
    }
  });

  // 修改右键菜单点击处理函数
  contextMenu.addEventListener('click', async (e) => {
    const menuItem = e.target.closest('.context-menu-item');
    if (!menuItem || !currentContextTarget) return;

    const action = menuItem.dataset.action;
    
    try {
      switch (action) {
        case 'new-group':
          const groupName = prompt('请输入新分组名称：');
          if (groupName?.trim()) {
            const result = await chrome.storage.sync.get(['groups']);
            const groups = result.groups || [];
            if (groups.includes(groupName)) {
              alert('该分组已存在');
              return;
            }
            groups.push(groupName);
            await chrome.storage.sync.set({ groups });
            await initializeData();
          }
          break;

        case 'edit':
          // 获取正确的目标元素
          const targetElement = currentContextTarget.closest('.group-container') || currentContextTarget;
          
          if (targetElement.classList.contains('group-container') || 
              targetElement.closest('.group-header')) {
            // 编辑分组
            const groupName = targetElement.dataset.group;
            if (!groupName) {
              console.error('未找到分组名称');
              return;
            }
            
            const newName = prompt('请输入新的分组名称：', groupName);
            if (newName?.trim() && newName !== groupName) {
              const result = await chrome.storage.sync.get(['groups', 'links']);
              const groups = result.groups || [];
              const links = result.links || [];
              
              if (groups.includes(newName)) {
                alert('该分组名称已存在');
                return;
              }

              const groupIndex = groups.indexOf(groupName);
              if (groupIndex !== -1) {
                groups[groupIndex] = newName;
                const updatedLinks = links.map(link => {
                  if (link.group === groupName) {
                    return { ...link, group: newName };
                  }
                  return link;
                });
                
                await chrome.storage.sync.set({ 
                  groups: groups,
                  links: updatedLinks 
                });
                await initializeData();
              }
            }
          } else if (targetElement.classList.contains('link-button')) {
            // 编辑链接
            const linkName = targetElement.dataset.name;
            const url = targetElement.dataset.url;
            const newName = prompt('请输入新的链接名称：', linkName);
            if (newName?.trim() && newName !== linkName) {
              const result = await chrome.storage.sync.get(['links']);
              const links = result.links || [];
              const linkIndex = links.findIndex(l => l.url === url);
              if (linkIndex !== -1) {
                links[linkIndex].name = newName;
                await chrome.storage.sync.set({ links });
                await initializeData();
              }
            }
          }
          break;

        case 'delete':
          // 获取正确的目标元素
          const deleteTarget = currentContextTarget.closest('.group-container') || currentContextTarget;
          
          if (deleteTarget.classList.contains('group-container') || 
              deleteTarget.closest('.group-header')) {
            // 删除分组
            const groupName = deleteTarget.dataset.group;
            if (!groupName) {
              console.error('未找到分组名称');
              return;
            }
            
            if (confirm(`确定要删除分组 "${groupName}" 吗？\n该分组下的链接将移至"未分组"`)) {
              const result = await chrome.storage.sync.get(['groups', 'links']);
              const groups = result.groups || [];
              const links = result.links || [];
              
              const newGroups = groups.filter(g => g !== groupName);
              const updatedLinks = links.map(link => {
                if (link.group === groupName) {
                  return { ...link, group: '未分组' };
                }
                return link;
              });

              await chrome.storage.sync.set({ 
                groups: newGroups,
                links: updatedLinks 
              });
              await initializeData();
            }
          } else if (deleteTarget.classList.contains('link-button')) {
            // 删除链接
            const linkName = deleteTarget.dataset.name;
            const url = deleteTarget.dataset.url;
            if (confirm(`确定要删除链接 "${linkName}" 吗？`)) {
              const result = await chrome.storage.sync.get(['links']);
              const links = result.links || [];
              const newLinks = links.filter(l => l.url !== url);
              await chrome.storage.sync.set({ links: newLinks });
              await initializeData();
            }
          }
          break;
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    }
    
    hideContextMenu();
  });

  // 初始化加载
  initializeData();
});
