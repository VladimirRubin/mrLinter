var fs = require('fs');

module.exports = function(dir) {
    var currentDirToRead,
        directoriesFound,
        nextDirToReadIndex;

    if (!fs.existsSync(dir)) {
        return;
    }

    currentDirToRead = dir;
    directoriesFound = [dir];
    while (true) {
        fs.readdirSync(currentDirToRead).forEach(function(name) {
            var path = currentDirToRead+'/'+name;
            var stat = fs.lstatSync(path);
            if (stat.isDirectory()) {
                directoriesFound.push(path);
            } else {
                fs.unlinkSync(path);
            }
        });
        nextDirToReadIndex = directoriesFound.indexOf(currentDirToRead) + 1;
        if (nextDirToReadIndex >= directoriesFound.length) {
            break;
        }
        currentDirToRead = directoriesFound[nextDirToReadIndex];
    }

    directoriesFound.reverse();
    directoriesFound.forEach(function(path) {
        fs.rmdirSync(path);
    });
}