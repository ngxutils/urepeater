document.querySelector('#okBtn').addEventListener('click',()=>{
    window.location.href =`https://${document.querySelector('#searchInp').value.replace(/^http(s)?:\/\//gi, '')}`;
})