document.querySelector('#okBtn').addEventListener('click',()=>{
    window.location.href =`http://${document.querySelector('#searchInp').value.replace('/^http(s)?:\/\//gi', '')}`;
})