Gmail FilterX
=============

GreaseMonkey script that allows to quickly add an email to the "from" field of an existing filter.

Notes:
- Works only when Gmail is in English (must say "edit" to edit a filter)
- Filters that should be included in the dropDownList, must include the following string (including the quotes)
	in the "Doesn't have" field:

		"filterName:<FilterName>"
		
	\<FilterName\>: should be replaced by the wanted filter name, can contain spaces. 
		E.g.: "filterName:Friends Emails"
