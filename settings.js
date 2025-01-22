document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const addLinkButton = document.getElementById('addLink');
  const newLinkName = document.getElementById('newLinkName');
  const newLinkURL = document.getElementById('newLinkURL');
  const linkGroup = document.getElementById('linkGroup');
  const linkList = document.getElementById('linkList');
  const saveSettingsButton = document.getElementById('saveSettings');
  const addGroupButton = document.getElementById('addGroup');
  const newGroupInput = document.getElementById('newGroupInput');
  const groupList = document.getElementById('groupList');
  const groupSelect = document.getElementById('groupSelect');

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

  // 加载分组和链接
  function loadGroups() {
    chrome.storage.sync.get(['groups', 'links'], (result) => {
      const groups = result.groups || [];
      updateGroupList(groups);
      updateGroupSelect(groups);
    });
  }

  // 更新分组列表显示
  function updateGroupList(groups) {
    groupList.innerHTML = '';
    groups.forEach(group => {
      const groupItem = createGroupItem(group);
      groupList.appendChild(groupItem);
    });
  }

  // 更新分组选择下拉框
  function updateGroupSelect(groups) {
    groupSelect.innerHTML = '<option value="">选择分组</option>';
    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      groupSelect.appendChild(option);
    });
  }

  // 添加新链接
  addLinkButton.addEventListener('click', () => {
    const name = newLinkName.value.trim();
    const url = newLinkURL.value.trim();
    const group = groupSelect.value;

    if (!name || !url) {
      alert('请填写链接名称和地址');
      return;
    }

    chrome.storage.sync.get(['links'], (result) => {
      const links = result.links || [];
      links.push({
        name: name,
        url: url,
        group: group || '未分组'
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

  // 添加新分组
  addGroupButton.addEventListener('click', () => {
    const groupName = newGroupInput.value.trim();
    if (!groupName) {
      alert('请输入分组名称');
      return;
    }

    chrome.storage.sync.get(['groups'], (result) => {
      const groups = result.groups || [];
      if (groups.includes(groupName)) {
        alert('该分组已存在');
        return;
      }

      groups.push(groupName);
      chrome.storage.sync.set({ groups }, () => {
        newGroupInput.value = '';
        loadGroups();
      });
    });
  });

  // 删除分组
  window.deleteGroup = function(groupName) {
    if (confirm(`确定要删除分组 "${groupName}" 吗？`)) {
      chrome.storage.sync.get(['groups', 'links'], (result) => {
        const groups = result.groups || [];
        const links = result.links || [];
        
        // 更新分组列表
        const newGroups = groups.filter(g => g !== groupName);
        
        // 将该分组下的链接移到"未分组"
        const updatedLinks = links.map(link => {
          if (link.group === groupName) {
            return { ...link, group: '未分组' };
          }
          return link;
        });

        chrome.storage.sync.set({ 
          groups: newGroups,
          links: updatedLinks 
        }, () => {
          loadGroups();
          displayLinks(updatedLinks);
        });
      });
    }
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

  // 添加分组编辑功能
  function createGroupItem(group) {
    const groupItem = document.createElement('div');
    groupItem.className = 'group-item';
    
    const groupNameSpan = document.createElement('span');
    groupNameSpan.textContent = group;
    groupNameSpan.addEventListener('dblclick', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = group;
      input.className = 'edit-group-input';
      
      const saveEdit = () => {
        const newName = input.value.trim();
        if (newName && newName !== group) {
          chrome.storage.sync.get(['groups', 'links'], (result) => {
            const groups = result.groups || [];
            const links = result.links || [];
            
            // 更新分组名称
            const groupIndex = groups.indexOf(group);
            if (groupIndex !== -1) {
              groups[groupIndex] = newName;
              
              // 更新该分组下所有链接的分组名称
              const updatedLinks = links.map(link => {
                if (link.group === group) {
                  return { ...link, group: newName };
                }
                return link;
              });
              
              chrome.storage.sync.set({ 
                groups: groups,
                links: updatedLinks 
              }, () => {
                loadGroups();
                displayLinks(updatedLinks);
              });
            }
          });
        } else {
          groupItem.replaceChild(groupNameSpan, input);
        }
      };
      
      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveEdit();
        } else if (e.key === 'Escape') {
          groupItem.replaceChild(groupNameSpan, input);
        }
      });
      
      groupItem.replaceChild(input, groupNameSpan);
      input.focus();
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete';
    deleteButton.textContent = '删除';
    deleteButton.onclick = () => deleteGroup(group);
    
    groupItem.appendChild(groupNameSpan);
    groupItem.appendChild(deleteButton);
    
    return groupItem;
  }

  // 初始加载链接
  loadGroups();
});
