document.addEventListener('DOMContentLoaded', function() {
  // 清除存储的链接（仅用于测试）
  // chrome.storage.sync.clear(() => {
  //   console.log('存储已清除');
  // });

  const searchInput = document.getElementById('searchLinks');
  
  // 从存储中获取用户添加的链接
  chrome.storage.sync.get(['links'], (result) => {
    console.log('当前存储的链接:', result.links);
    const userLinks = result.links || [];
    
    // 渲染用户添加的链接按钮
    userLinks.forEach((link) => {
      console.log('正在渲染链接:', link.name);
      const button = document.createElement('button');
      button.textContent = link.name;
      button.title = '单击打开链接，双击编辑名称，右键删除';
      
      // 使用计时器来处理单击和双击
      let clickTimer = null;
      
      // 点击事件处理
      button.addEventListener('click', (e) => {
        if (clickTimer === null) {
          clickTimer = setTimeout(() => {
            // 单击操作
            console.log('点击链接:', link.url);
            chrome.tabs.create({ url: link.url });
            clickTimer = null;
          }, 200); // 200ms 延迟
        } else {
          // 双击操作
          clearTimeout(clickTimer);
          clickTimer = null;
          
          e.preventDefault();
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'text';
          input.value = link.name;
          input.style.width = '100%';
          input.style.padding = '8px';
          input.style.boxSizing = 'border-box';
          button.replaceWith(input);
          input.focus();

          const saveEdit = () => {
            const newName = input.value.trim();
            if (newName) {
              link.name = newName;
              chrome.storage.sync.get(['links'], (result) => {
                const links = result.links || [];
                const linkIndex = links.findIndex(l => l.url === link.url);
                if (linkIndex !== -1) {
                  links[linkIndex].name = newName;
                  chrome.storage.sync.set({ links }, () => {
                    console.log('链接名称已更新');
                    button.textContent = newName;
                    input.replaceWith(button);
                  });
                }
              });
            } else {
              input.replaceWith(button);
            }
          };

          input.addEventListener('blur', saveEdit);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              saveEdit();
            } else if (e.key === 'Escape') {
              input.replaceWith(button);
            }
          });
        }
      });

      // 右键删除链接
      button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(`确定要删除链接 "${link.name}" 吗？`)) {
          chrome.storage.sync.get(['links'], (result) => {
            const links = result.links || [];
            const newLinks = links.filter(l => l.url !== link.url);
            chrome.storage.sync.set({ links: newLinks }, () => {
              console.log('链接已删除');
              button.remove();
            });
          });
        }
      });

      document.body.appendChild(button);
    });

    // 搜索功能
    searchInput.addEventListener('input', (e) => {
      console.log('搜索关键词:', e.target.value);
      const searchTerm = e.target.value.toLowerCase();
      const buttons = document.querySelectorAll('button');
      
      buttons.forEach(button => {
        const text = button.textContent.toLowerCase();
        button.style.display = text.includes(searchTerm) ? 'block' : 'none';
      });
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
});
