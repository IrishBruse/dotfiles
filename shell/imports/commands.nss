// Zip
menu(type="file|dir" mode=multiple expanded=true)
{
	$test = @sel.parent.name+".zip"
	item(pos=indexof('Code',1,pos.top) title='Add to @test' image=icon.compressed type='file|dir' cmd='7zG' args='a -tzip @sel.parent.name .zip @sel(true," ")')
	item(pos=indexof('Code',1,pos.top) title='Extract to @sel.title/' where=str.end(sel.name,".zip") image=icon.compressed type='file' cmd='7zG' args=('e -y @sel.name -o@sel.title/'))
}

// Reorder items
modify(pos=pos.top image=\uE272 find='"Open with Code"')
modify(pos=pos.top image=\uE0AC find='"Open Alacritty here"')
modify(pos=pos.top menu=title.more_options find='"Paste Into File"')

modify(pos=pos.bottom image=\uE19B title="File Lockpick" find="What's using this file?")
modify(pos=pos.bottom find='Refresh')
modify(pos=pos.bottom find='Properties')
